/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  User,
  signOut
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';
import { DatabaseState } from '../types/portfolio';

// Initialize Firebase App instance safely
export const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Configure Google Auth Provider with Google Sheets and Drive scopes
const provider = new GoogleAuthProvider();
provider.addScope('https://www.googleapis.com/auth/spreadsheets');
provider.addScope('https://www.googleapis.com/auth/drive.file');

// In-memory token cache (never in localStorage per security guidelines)
let cachedAccessToken: string | null = null;
let isSigningIn = false;

export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else if (!isSigningIn) {
        cachedAccessToken = null;
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

export const googleSignIn = async (): Promise<{
  user: User;
  accessToken: string;
} | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Falha ao obter token de acesso do Google OAuth');
    }
    cachedAccessToken = credential.accessToken;
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error) {
    console.error('Google Sign-in error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken;
};

export const logoutGoogle = async () => {
  await signOut(auth);
  cachedAccessToken = null;
};

/**
 * Searches user's Google Drive for existing AlePortfolio_Database, or creates a new one
 */
export async function findOrCreatePortfolioSpreadsheet(
  accessToken: string
): Promise<{ spreadsheetId: string; title: string; url: string; createdNew: boolean }> {
  // 1. Search for existing spreadsheet in Drive
  const searchUrl =
    "https://www.googleapis.com/drive/v3/files?q=name='AlePortfolio_Database' and mimeType='application/vnd.google-apps.spreadsheet' and trashed=false&fields=files(id,name,webViewLink)";

  const searchRes = await fetch(searchUrl, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });

  if (!searchRes.ok) {
    const errText = await searchRes.text();
    throw new Error(`Erro ao consultar Google Drive: ${errText}`);
  }

  const searchData = await searchRes.json();
  if (searchData.files && searchData.files.length > 0) {
    const existing = searchData.files[0];
    return {
      spreadsheetId: existing.id,
      title: existing.name,
      url: existing.webViewLink || `https://docs.google.com/spreadsheets/d/${existing.id}`,
      createdNew: false
    };
  }

  // 2. Create new spreadsheet with all 13 sheets
  const sheetNames = [
    'BROKERS',
    'ASSETS',
    'PORTFOLIO',
    'TRANSACTIONS',
    'ALLOCATIONS',
    'EXCHANGE_RATES',
    'DIVIDENDS',
    'TAX_MONTHLY',
    'TAX_LOSSES',
    'DARF',
    'CASH_BALANCES',
    'SETTINGS',
    'AUDIT_LOG'
  ];

  const createBody = {
    properties: {
      title: 'AlePortfolio_Database'
    },
    sheets: sheetNames.map((name) => ({
      properties: { title: name }
    }))
  };

  const createRes = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(createBody)
  });

  if (!createRes.ok) {
    const errText = await createRes.text();
    throw new Error(`Erro ao criar planilha no Google Sheets: ${errText}`);
  }

  const newSheet = await createRes.json();
  return {
    spreadsheetId: newSheet.spreadsheetId,
    title: newSheet.properties?.title || 'AlePortfolio_Database',
    url: newSheet.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${newSheet.spreadsheetId}`,
    createdNew: true
  };
}

/**
 * Syncs the in-memory database to Google Sheets
 */
export async function syncDatabaseToGoogleSheets(
  accessToken: string,
  spreadsheetId: string,
  db: DatabaseState
): Promise<{ success: boolean; updatedCells: number }> {
  const payloadData: Array<{ range: string; values: any[][] }> = [];

  // 1. BROKERS
  payloadData.push({
    range: 'BROKERS!A1:G',
    values: [
      ['broker_id', 'name', 'country', 'base_currency', 'active', 'supported_asset_classes', 'notes'],
      ...db.brokers.map((b) => [
        b.broker_id,
        b.name,
        b.country,
        b.base_currency,
        b.active ? 'TRUE' : 'FALSE',
        b.supported_asset_classes.join(', '),
        b.notes || ''
      ])
    ]
  });

  // 2. ASSETS
  payloadData.push({
    range: 'ASSETS!A1:H',
    values: [
      ['ticker', 'name', 'broker_id', 'asset_class', 'currency', 'current_price', 'price_updated_at', 'sector'],
      ...db.assets.map((a) => [
        a.ticker,
        a.name,
        a.broker_id,
        a.asset_class,
        a.currency,
        a.current_price,
        a.price_updated_at,
        a.sector || ''
      ])
    ]
  });

  // 3. PORTFOLIO
  payloadData.push({
    range: 'PORTFOLIO!A1:M',
    values: [
      [
        'holding_id', 'broker_id', 'ticker', 'name', 'asset_class',
        'quantity', 'average_price', 'total_invested', 'current_price',
        'market_value', 'unrealized_pl', 'unrealized_pl_pct', 'market_value_brl'
      ],
      ...db.holdings.map((h) => [
        h.holding_id,
        h.broker_id,
        h.ticker,
        h.name,
        h.asset_class,
        h.quantity,
        h.average_price,
        h.total_invested,
        h.current_price,
        h.market_value,
        h.unrealized_pl,
        h.unrealized_pl_pct,
        h.market_value_brl
      ])
    ]
  });

  // 4. TRANSACTIONS
  payloadData.push({
    range: 'TRANSACTIONS!A1:R',
    values: [
      [
        'transaction_id', 'broker_id', 'date', 'ticker', 'type',
        'trade_category', 'quantity', 'unit_price', 'gross_value',
        'brokerage_fees', 'b3_emoluments', 'irrf', 'net_value',
        'currency', 'exchange_rate', 'realized_pl', 'statement_ref', 'reconciliation_hash'
      ],
      ...db.transactions.map((t) => [
        t.transaction_id,
        t.broker_id,
        t.date,
        t.ticker,
        t.type,
        t.trade_category,
        t.quantity,
        t.unit_price,
        t.gross_value,
        t.brokerage_fees,
        t.b3_emoluments,
        t.irrf,
        t.net_value,
        t.currency,
        t.exchange_rate,
        t.realized_pl || 0,
        t.statement_ref || '',
        t.reconciliation_hash
      ])
    ]
  });

  // 5. ALLOCATIONS
  payloadData.push({
    range: 'ALLOCATIONS!A1:G',
    values: [
      ['allocation_id', 'level', 'target_identifier', 'label', 'target_percentage', 'tolerance_warning_pp', 'tolerance_critical_pp'],
      ...db.allocations.map((al) => [
        al.allocation_id,
        al.level,
        al.target_identifier,
        al.label,
        al.target_percentage,
        al.tolerance_warning_pp,
        al.tolerance_critical_pp
      ])
    ]
  });

  // 6. EXCHANGE_RATES
  payloadData.push({
    range: 'EXCHANGE_RATES!A1:F',
    values: [
      ['rate_id', 'currency_pair', 'reference_date', 'rate', 'source', 'is_current'],
      ...db.exchange_rates.map((r) => [
        r.rate_id,
        r.currency_pair,
        r.reference_date,
        r.rate,
        r.source,
        r.is_current ? 'TRUE' : 'FALSE'
      ])
    ]
  });

  // 7. DIVIDENDS
  payloadData.push({
    range: 'DIVIDENDS!A1:I',
    values: [
      ['dividend_id', 'broker_id', 'ticker', 'type', 'payment_date', 'gross_amount', 'withholding_tax', 'net_amount', 'currency'],
      ...db.dividends.map((d) => [
        d.dividend_id,
        d.broker_id,
        d.ticker,
        d.type,
        d.payment_date,
        d.gross_amount,
        d.withholding_tax,
        d.net_amount,
        d.currency
      ])
    ]
  });

  // 8. TAX_MONTHLY
  payloadData.push({
    range: 'TAX_MONTHLY!A1:R',
    values: [
      [
        'tax_closing_id', 'year_month', 'broker_id', 'category', 'category_label',
        'total_sales_value', 'gross_profit_loss', 'deductible_costs', 'net_operational_result',
        'exempt_sales_flag', 'previous_accumulated_loss', 'loss_compensated', 'remaining_accumulated_loss',
        'taxable_base', 'tax_rate', 'gross_tax_due', 'irrf_credits_deducted', 'final_tax_due'
      ],
      ...db.tax_monthly.map((tm) => [
        tm.tax_closing_id,
        tm.year_month,
        tm.broker_id,
        tm.category,
        tm.category_label,
        tm.total_sales_value,
        tm.gross_profit_loss,
        tm.deductible_costs,
        tm.net_operational_result,
        tm.exempt_sales_flag ? 'TRUE' : 'FALSE',
        tm.previous_accumulated_loss,
        tm.loss_compensated,
        tm.remaining_accumulated_loss,
        tm.taxable_base,
        tm.tax_rate,
        tm.gross_tax_due,
        tm.irrf_credits_deducted,
        tm.final_tax_due
      ])
    ]
  });

  // 9. TAX_LOSSES
  payloadData.push({
    range: 'TAX_LOSSES!A1:G',
    values: [
      ['loss_id', 'category', 'year_month', 'beginning_loss_balance', 'loss_incurred_in_month', 'loss_compensated_in_month', 'ending_loss_balance'],
      ...db.tax_losses.map((tl) => [
        tl.loss_id,
        tl.category,
        tl.year_month,
        tl.beginning_loss_balance,
        tl.loss_incurred_in_month,
        tl.loss_compensated_in_month,
        tl.ending_loss_balance
      ])
    ]
  });

  // 10. DARF
  payloadData.push({
    range: 'DARF!A1:I',
    values: [
      ['darf_id', 'period_reference', 'tax_code', 'tax_code_description', 'amount_due', 'due_date', 'status', 'paid_date', 'notes'],
      ...db.darfs.map((df) => [
        df.darf_id,
        df.period_reference,
        df.tax_code,
        df.tax_code_description,
        df.amount_due,
        df.due_date,
        df.status,
        df.paid_date || '',
        df.notes || ''
      ])
    ]
  });

  // 11. CASH_BALANCES
  payloadData.push({
    range: 'CASH_BALANCES!A1:F',
    values: [
      ['balance_id', 'broker_id', 'currency', 'available_cash', 'reserved_cash', 'last_updated'],
      ...db.cash_balances.map((cb) => [
        cb.balance_id,
        cb.broker_id,
        cb.currency,
        cb.available_cash,
        cb.reserved_cash,
        cb.last_updated
      ])
    ]
  });

  // Batch update values
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      valueInputOption: 'USER_ENTERED',
      data: payloadData
    })
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Erro ao gravar dados no Google Sheets: ${errText}`);
  }

  const result = await res.json();
  return {
    success: true,
    updatedCells: result.totalUpdatedCells || 0
  };
}
