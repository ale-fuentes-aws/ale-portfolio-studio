/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express, { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import * as XLSX from 'xlsx';
import { INITIAL_FICTITIOUS_DATABASE } from './src/data/initialData';
import { DatabaseState, Transaction } from './src/types/portfolio';
import { buildAlePortfolioWorkbook } from './src/utils/excelDatabase';
import {
  recalculateHoldingsFromTransactions,
  calculateConsolidatedSummary,
  calculateAllocationComparisons
} from './src/utils/portfolioCalculations';
import { calculateBrazilianTaxForMonth } from './src/utils/taxCalculator';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;
const DB_DIR = path.resolve(__dirname, 'DB-Finc-AlePortfolio');
const DB_JSON_PATH = path.join(DB_DIR, 'aleportfolio_db.json');
const DB_EXCEL_PATH = path.join(DB_DIR, 'AlePortfolio_Database.xlsx');

// Ensure DB directory exists
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

// In-memory state initialized from file or fallback to initial fictitious sample dataset
let currentDbState: DatabaseState;

function saveDbStateToFile(state: DatabaseState) {
  try {
    fs.writeFileSync(DB_JSON_PATH, JSON.stringify(state, null, 2), 'utf-8');
    const wb = buildAlePortfolioWorkbook(state);
    XLSX.writeFile(wb, DB_EXCEL_PATH);
  } catch (err) {
    console.error('Error persisting database state to disk:', err);
  }
}

function loadOrInitDbState(): DatabaseState {
  if (fs.existsSync(DB_JSON_PATH)) {
    try {
      const content = fs.readFileSync(DB_JSON_PATH, 'utf-8');
      return JSON.parse(content);
    } catch (err) {
      console.warn('Could not read aleportfolio_db.json, loading initial sample data:', err);
    }
  }

  // Fallback: seed initial sample dataset
  const initial = JSON.parse(JSON.stringify(INITIAL_FICTITIOUS_DATABASE));
  saveDbStateToFile(initial);
  return initial;
}

currentDbState = loadOrInitDbState();

// Express App
const app = express();
app.use(express.json({ limit: '10mb' }));

/**
 * Re-computes dynamic portfolio holdings and tax closings
 */
function runFullRecalculation() {
  const currentRate =
    currentDbState.exchange_rates.find((r) => r.is_current)?.rate || 5.42;
  const rateDate =
    currentDbState.exchange_rates.find((r) => r.is_current)?.reference_date ||
    '2026-11-02';

  // Recalculate holdings from transactions
  const { holdings, updatedTransactions } = recalculateHoldingsFromTransactions(
    currentDbState.transactions,
    currentDbState.assets,
    currentRate
  );
  currentDbState.holdings = holdings;
  currentDbState.transactions = updatedTransactions;

  // Recalculate Brazilian taxes for months with Clear transactions
  const assetMap = new Map(currentDbState.assets.map((a) => [a.ticker, a]));
  const clearMonths = Array.from(
    new Set(
      currentDbState.transactions
        .filter((t) => t.broker_id === 'CLEAR')
        .map((t) => t.date.slice(0, 7))
    )
  ).sort();

  let runningLosses: any = {
    ACOES_SWING: 0,
    DAY_TRADE: 0,
    FIIS: 0,
    FUTUROS_SWING: 0
  };

  const calculatedTaxMonthly: any[] = [];
  const calculatedDarfs: any[] = [];
  let carryoverTax = 0;

  for (const ym of clearMonths) {
    const taxRes = calculateBrazilianTaxForMonth(
      ym,
      currentDbState.transactions,
      assetMap,
      runningLosses,
      carryoverTax
    );

    calculatedTaxMonthly.push(...taxRes.monthlyCalculations);
    runningLosses = taxRes.endingLosses;
    carryoverTax = taxRes.accumulatedCarryoverTax;

    if (taxRes.darfRecord) {
      // Check if user previously marked this darf as paid
      const existingDarf = currentDbState.darfs.find(
        (d) => d.period_reference === ym
      );
      if (existingDarf && existingDarf.status === 'DARF_PAID') {
        taxRes.darfRecord.status = 'DARF_PAID';
        taxRes.darfRecord.paid_date = existingDarf.paid_date;
        taxRes.darfRecord.paid_amount = existingDarf.paid_amount;
        taxRes.darfRecord.proof_reference = existingDarf.proof_reference;
      }
      calculatedDarfs.push(taxRes.darfRecord);
    }
  }

  if (calculatedTaxMonthly.length > 0) {
    currentDbState.tax_monthly = calculatedTaxMonthly;
  }
  if (calculatedDarfs.length > 0) {
    currentDbState.darfs = calculatedDarfs;
  }

  saveDbStateToFile(currentDbState);
}

// Initial calculation run
runFullRecalculation();

// API Endpoints
app.get('/api/portfolio', (req: Request, res: Response) => {
  const currentRate =
    currentDbState.exchange_rates.find((r) => r.is_current)?.rate || 5.42;
  const rateDate =
    currentDbState.exchange_rates.find((r) => r.is_current)?.reference_date ||
    '2026-11-02';

  const pendingDarf = currentDbState.darfs.find(
    (d) => d.status === 'DARF_PENDING_PAYMENT' || d.status === 'DARF_OVERDUE'
  );

  const summary = calculateConsolidatedSummary(
    currentDbState.holdings,
    currentDbState.cash_balances,
    currentRate,
    rateDate,
    currentDbState.transactions,
    pendingDarf ? pendingDarf.amount_due : 0,
    pendingDarf ? pendingDarf.status : 'NO_DARF_REQUIRED'
  );

  const allocationComparisons = calculateAllocationComparisons(
    currentDbState.allocations,
    currentDbState.holdings,
    currentDbState.cash_balances,
    currentRate
  );

  res.json({
    state: currentDbState,
    summary,
    allocationComparisons
  });
});

app.post('/api/portfolio/transaction', (req: Request, res: Response) => {
  const tx: Transaction = req.body;
  if (!tx.ticker || !tx.quantity || !tx.unit_price) {
    return res.status(400).json({ error: 'Campos obrigatórios ausentes' });
  }

  // Ensure transaction ID and reconciliation hash
  if (!tx.transaction_id) {
    tx.transaction_id = `TX-${Date.now()}`;
  }
  if (!tx.reconciliation_hash) {
    tx.reconciliation_hash = `${tx.broker_id}_${tx.ticker}_${tx.type}_${tx.date}_${tx.quantity}_${tx.unit_price}`;
  }

  // Duplicate check
  const duplicate = currentDbState.transactions.find(
    (t) => t.reconciliation_hash === tx.reconciliation_hash
  );
  if (duplicate) {
    return res.status(409).json({ error: 'Transação duplicada detectada' });
  }

  currentDbState.transactions.push(tx);

  // Add audit log
  currentDbState.audit_logs.unshift({
    log_id: `LOG-${Date.now()}`,
    timestamp: new Date().toISOString(),
    event_type: 'TRANSACTION_ADD',
    entity: 'TRANSACTIONS',
    details: `${tx.type} ${tx.quantity}x ${tx.ticker} @ ${tx.unit_price} (${tx.broker_id})`,
    operator: 'USER'
  });

  runFullRecalculation();
  res.json({ success: true, transaction: tx });
});

app.delete('/api/portfolio/transaction/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const initialLen = currentDbState.transactions.length;
  currentDbState.transactions = currentDbState.transactions.filter(
    (t) => t.transaction_id !== id
  );

  if (currentDbState.transactions.length === initialLen) {
    return res.status(404).json({ error: 'Transação não encontrada' });
  }

  currentDbState.audit_logs.unshift({
    log_id: `LOG-${Date.now()}`,
    timestamp: new Date().toISOString(),
    event_type: 'TRANSACTION_DELETE',
    entity: 'TRANSACTIONS',
    details: `Transação removida: ${id}`,
    operator: 'USER'
  });

  runFullRecalculation();
  res.json({ success: true });
});

app.post('/api/portfolio/exchange-rate', (req: Request, res: Response) => {
  const { rate, reference_date, source } = req.body;
  const numRate = parseFloat(rate);
  if (!numRate || numRate <= 0) {
    return res.status(400).json({ error: 'Taxa de câmbio inválida' });
  }

  // Deactivate old current rates
  currentDbState.exchange_rates.forEach((r) => (r.is_current = false));

  // Add new current rate
  currentDbState.exchange_rates.unshift({
    rate_id: `USD_BRL_${Date.now()}`,
    currency_pair: 'USD/BRL',
    reference_date: reference_date || new Date().toISOString().slice(0, 10),
    rate: Math.round(numRate * 10000) / 10000,
    source: source || 'Manual / PTAX',
    is_current: true
  });

  currentDbState.audit_logs.unshift({
    log_id: `LOG-${Date.now()}`,
    timestamp: new Date().toISOString(),
    event_type: 'EXCHANGE_RATE_UPDATE',
    entity: 'EXCHANGE_RATES',
    details: `Taxa USD/BRL atualizada para ${numRate}`,
    operator: 'USER'
  });

  runFullRecalculation();
  res.json({ success: true, current_rate: numRate });
});

app.post('/api/portfolio/cash', (req: Request, res: Response) => {
  const { broker_id, available_cash, reserved_cash } = req.body;
  const target = currentDbState.cash_balances.find(
    (c) => c.broker_id === broker_id
  );
  if (target) {
    target.available_cash = parseFloat(available_cash) || 0;
    if (reserved_cash !== undefined) {
      target.reserved_cash = parseFloat(reserved_cash) || 0;
    }
    target.last_updated = new Date().toISOString();
  }

  runFullRecalculation();
  res.json({ success: true });
});

app.post('/api/portfolio/rebalance-target', (req: Request, res: Response) => {
  const { targets } = req.body;
  if (Array.isArray(targets)) {
    currentDbState.allocations = targets;
  }
  saveDbStateToFile(currentDbState);
  res.json({ success: true });
});

app.post('/api/portfolio/darf-pay', (req: Request, res: Response) => {
  const { darf_id, paid_date, paid_amount, proof_reference } = req.body;
  const darf = currentDbState.darfs.find((d) => d.darf_id === darf_id);
  if (!darf) {
    return res.status(404).json({ error: 'Guia DARF não encontrada' });
  }

  darf.status = 'DARF_PAID';
  darf.paid_date = paid_date || new Date().toISOString().slice(0, 10);
  darf.paid_amount = parseFloat(paid_amount) || darf.amount_due;
  darf.proof_reference = proof_reference || 'Comprovante registrado';

  currentDbState.audit_logs.unshift({
    log_id: `LOG-${Date.now()}`,
    timestamp: new Date().toISOString(),
    event_type: 'DARF_PAYMENT',
    entity: 'DARF',
    details: `DARF ${darf_id} de R$ ${darf.amount_due} liquidada em ${darf.paid_date}`,
    operator: 'USER'
  });

  saveDbStateToFile(currentDbState);
  res.json({ success: true, darf });
});

app.post('/api/portfolio/reset-sample', (req: Request, res: Response) => {
  currentDbState = JSON.parse(JSON.stringify(INITIAL_FICTITIOUS_DATABASE));
  runFullRecalculation();
  res.json({ success: true, message: 'Dados de amostra restaurados com sucesso' });
});

app.post('/api/portfolio/clear-all', (req: Request, res: Response) => {
  currentDbState = {
    is_sample_data: false,
    brokers: INITIAL_FICTITIOUS_DATABASE.brokers,
    assets: INITIAL_FICTITIOUS_DATABASE.assets,
    holdings: [],
    transactions: [],
    allocations: INITIAL_FICTITIOUS_DATABASE.allocations,
    exchange_rates: [
      {
        rate_id: `USD_BRL_${Date.now()}`,
        currency_pair: 'USD/BRL',
        reference_date: new Date().toISOString().slice(0, 10),
        rate: 5.42,
        source: 'PTAX',
        is_current: true
      }
    ],
    dividends: [],
    tax_monthly: [],
    tax_losses: [],
    darfs: [],
    cash_balances: [
      {
        balance_id: 'CASH_CLEAR',
        broker_id: 'CLEAR',
        currency: 'BRL',
        available_cash: 0,
        reserved_cash: 0,
        last_updated: new Date().toISOString()
      },
      {
        balance_id: 'CASH_NOMAD',
        broker_id: 'NOMAD',
        currency: 'USD',
        available_cash: 0,
        reserved_cash: 0,
        last_updated: new Date().toISOString()
      }
    ],
    settings: {
      base_currency: 'BRL',
      rebalance_tolerance_warning_pp: '2.0',
      rebalance_tolerance_critical_pp: '5.0',
      auto_refresh_ptax: 'true',
      darf_auto_alert: 'true',
      google_sheets_sync_enabled: 'false',
      connected_sheet_id: ''
    },
    audit_logs: [
      {
        log_id: `LOG-${Date.now()}`,
        timestamp: new Date().toISOString(),
        event_type: 'CARTEIRA_ZERADA',
        entity: 'DATABASE',
        details: 'Carteira limpa para início de novos lançamentos.',
        operator: 'USER'
      }
    ]
  };

  runFullRecalculation();
  res.json({ success: true, message: 'Carteira limpa com sucesso' });
});

app.get('/api/portfolio/export-excel', (req: Request, res: Response) => {
  const wb = buildAlePortfolioWorkbook(currentDbState);
  const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

  res.setHeader(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  );
  res.setHeader(
    'Content-Disposition',
    'attachment; filename="AlePortfolio_Database.xlsx"'
  );
  res.send(buffer);
});

app.post('/api/portfolio/import', (req: Request, res: Response) => {
  const { transactions } = req.body;
  if (!Array.isArray(transactions) || transactions.length === 0) {
    return res.status(400).json({ error: 'Nenhuma transação válida enviada' });
  }

  let importedCount = 0;
  for (const raw of transactions) {
    const hash =
      raw.reconciliation_hash ||
      `${raw.broker_id}_${raw.ticker}_${raw.type}_${raw.date}_${raw.quantity}_${raw.unit_price}`;

    const exists = currentDbState.transactions.some(
      (t) => t.reconciliation_hash === hash
    );
    if (!exists) {
      currentDbState.transactions.push({
        ...raw,
        transaction_id: raw.transaction_id || `IMP-${Date.now()}-${importedCount}`,
        reconciliation_hash: hash
      });
      importedCount++;
    }
  }

  currentDbState.audit_logs.unshift({
    log_id: `LOG-${Date.now()}`,
    timestamp: new Date().toISOString(),
    event_type: 'TRANSACTIONS_BATCH_IMPORT',
    entity: 'TRANSACTIONS',
    details: `${importedCount} transações importadas com reconciliação`,
    operator: 'USER'
  });

  runFullRecalculation();
  res.json({ success: true, importedCount });
});

// Start dev or production server
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`AlePortfolio server active at http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
});
