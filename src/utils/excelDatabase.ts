/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as XLSX from 'xlsx';
import { DatabaseState, Transaction } from '../types/portfolio';

/**
 * Builds a 13-sheet XLSX Workbook representing the entire AlePortfolio Database
 */
export function buildAlePortfolioWorkbook(db: DatabaseState): XLSX.WorkBook {
  const wb = XLSX.utils.book_new();

  // 1. BROKERS
  const brokersData = db.brokers.map((b) => ({
    broker_id: b.broker_id,
    name: b.name,
    country: b.country,
    base_currency: b.base_currency,
    active: b.active ? 'SIM' : 'NAO',
    supported_asset_classes: b.supported_asset_classes.join(', '),
    notes: b.notes || ''
  }));
  const wsBrokers = XLSX.utils.json_to_sheet(brokersData);
  XLSX.utils.book_append_sheet(wb, wsBrokers, 'BROKERS');

  // 2. ASSETS
  const assetsData = db.assets.map((a) => ({
    ticker: a.ticker,
    name: a.name,
    broker_id: a.broker_id,
    asset_class: a.asset_class,
    currency: a.currency,
    current_price: a.current_price,
    price_updated_at: a.price_updated_at,
    sector: a.sector || ''
  }));
  const wsAssets = XLSX.utils.json_to_sheet(assetsData);
  XLSX.utils.book_append_sheet(wb, wsAssets, 'ASSETS');

  // 3. PORTFOLIO
  const portfolioData = db.holdings.map((h) => ({
    holding_id: h.holding_id,
    broker_id: h.broker_id,
    ticker: h.ticker,
    name: h.name,
    asset_class: h.asset_class,
    quantity: h.quantity,
    average_price: h.average_price,
    total_invested: h.total_invested,
    current_price: h.current_price,
    market_value: h.market_value,
    unrealized_pl: h.unrealized_pl,
    unrealized_pl_pct: `${h.unrealized_pl_pct.toFixed(2)}%`,
    currency: h.currency,
    market_value_brl: h.market_value_brl
  }));
  const wsPortfolio = XLSX.utils.json_to_sheet(portfolioData);
  XLSX.utils.book_append_sheet(wb, wsPortfolio, 'PORTFOLIO');

  // 4. TRANSACTIONS
  const transactionsData = db.transactions.map((t) => ({
    transaction_id: t.transaction_id,
    broker_id: t.broker_id,
    date: t.date,
    ticker: t.ticker,
    type: t.type,
    trade_category: t.trade_category,
    quantity: t.quantity,
    unit_price: t.unit_price,
    gross_value: t.gross_value,
    brokerage_fees: t.brokerage_fees,
    b3_emoluments: t.b3_emoluments,
    irrf: t.irrf,
    net_value: t.net_value,
    currency: t.currency,
    exchange_rate: t.exchange_rate,
    realized_pl: t.realized_pl || 0,
    statement_ref: t.statement_ref || '',
    reconciliation_hash: t.reconciliation_hash
  }));
  const wsTransactions = XLSX.utils.json_to_sheet(transactionsData);
  XLSX.utils.book_append_sheet(wb, wsTransactions, 'TRANSACTIONS');

  // 5. ALLOCATIONS
  const allocationsData = db.allocations.map((al) => ({
    allocation_id: al.allocation_id,
    level: al.level,
    target_identifier: al.target_identifier,
    label: al.label,
    target_percentage: `${al.target_percentage.toFixed(1)}%`,
    tolerance_warning_pp: `${al.tolerance_warning_pp.toFixed(1)} pp`,
    tolerance_critical_pp: `${al.tolerance_critical_pp.toFixed(1)} pp`
  }));
  const wsAllocations = XLSX.utils.json_to_sheet(allocationsData);
  XLSX.utils.book_append_sheet(wb, wsAllocations, 'ALLOCATIONS');

  // 6. EXCHANGE_RATES
  const ratesData = db.exchange_rates.map((r) => ({
    rate_id: r.rate_id,
    currency_pair: r.currency_pair,
    reference_date: r.reference_date,
    rate: r.rate,
    source: r.source,
    is_current: r.is_current ? 'SIM' : 'NAO'
  }));
  const wsRates = XLSX.utils.json_to_sheet(ratesData);
  XLSX.utils.book_append_sheet(wb, wsRates, 'EXCHANGE_RATES');

  // 7. DIVIDENDS
  const dividendsData = db.dividends.map((d) => ({
    dividend_id: d.dividend_id,
    broker_id: d.broker_id,
    ticker: d.ticker,
    type: d.type,
    payment_date: d.payment_date,
    gross_amount: d.gross_amount,
    withholding_tax: d.withholding_tax,
    net_amount: d.net_amount,
    currency: d.currency
  }));
  const wsDividends = XLSX.utils.json_to_sheet(dividendsData);
  XLSX.utils.book_append_sheet(wb, wsDividends, 'DIVIDENDS');

  // 8. TAX_MONTHLY
  const taxMonthlyData = db.tax_monthly.map((tm) => ({
    tax_closing_id: tm.tax_closing_id,
    year_month: tm.year_month,
    broker_id: tm.broker_id,
    category: tm.category,
    category_label: tm.category_label,
    total_sales_value: tm.total_sales_value,
    gross_profit_loss: tm.gross_profit_loss,
    deductible_costs: tm.deductible_costs,
    net_operational_result: tm.net_operational_result,
    exempt_sales_flag: tm.exempt_sales_flag ? 'SIM' : 'NAO',
    previous_accumulated_loss: tm.previous_accumulated_loss,
    loss_compensated: tm.loss_compensated,
    remaining_accumulated_loss: tm.remaining_accumulated_loss,
    taxable_base: tm.taxable_base,
    tax_rate: `${(tm.tax_rate * 100).toFixed(0)}%`,
    gross_tax_due: tm.gross_tax_due,
    irrf_credits_deducted: tm.irrf_credits_deducted,
    prior_underminimum_tax: tm.prior_underminimum_tax,
    final_tax_due: tm.final_tax_due,
    closing_status: tm.closing_status,
    legal_reference: tm.legal_reference
  }));
  const wsTaxMonthly = XLSX.utils.json_to_sheet(taxMonthlyData);
  XLSX.utils.book_append_sheet(wb, wsTaxMonthly, 'TAX_MONTHLY');

  // 9. TAX_LOSSES
  const taxLossesData = db.tax_losses.map((tl) => ({
    loss_id: tl.loss_id,
    category: tl.category,
    year_month: tl.year_month,
    beginning_loss_balance: tl.beginning_loss_balance,
    loss_incurred_in_month: tl.loss_incurred_in_month,
    loss_compensated_in_month: tl.loss_compensated_in_month,
    ending_loss_balance: tl.ending_loss_balance
  }));
  const wsTaxLosses = XLSX.utils.json_to_sheet(taxLossesData);
  XLSX.utils.book_append_sheet(wb, wsTaxLosses, 'TAX_LOSSES');

  // 10. DARF
  const darfData = db.darfs.map((df) => ({
    darf_id: df.darf_id,
    period_reference: df.period_reference,
    tax_code: df.tax_code,
    tax_code_description: df.tax_code_description,
    amount_due: df.amount_due,
    due_date: df.due_date,
    status: df.status,
    paid_date: df.paid_date || '',
    paid_amount: df.paid_amount || '',
    proof_reference: df.proof_reference || '',
    breakdown_summary: df.breakdown_summary || '',
    notes: df.notes || ''
  }));
  const wsDarf = XLSX.utils.json_to_sheet(darfData);
  XLSX.utils.book_append_sheet(wb, wsDarf, 'DARF');

  // 11. CASH_BALANCES
  const cashData = db.cash_balances.map((cb) => ({
    balance_id: cb.balance_id,
    broker_id: cb.broker_id,
    currency: cb.currency,
    available_cash: cb.available_cash,
    reserved_cash: cb.reserved_cash,
    last_updated: cb.last_updated
  }));
  const wsCash = XLSX.utils.json_to_sheet(cashData);
  XLSX.utils.book_append_sheet(wb, wsCash, 'CASH_BALANCES');

  // 12. SETTINGS
  const settingsData = Object.entries(db.settings).map(([key, value]) => ({
    key,
    value
  }));
  const wsSettings = XLSX.utils.json_to_sheet(settingsData);
  XLSX.utils.book_append_sheet(wb, wsSettings, 'SETTINGS');

  // 13. AUDIT_LOG
  const auditData = db.audit_logs.map((al) => ({
    log_id: al.log_id,
    timestamp: al.timestamp,
    event_type: al.event_type,
    entity: al.entity,
    details: al.details,
    operator: al.operator
  }));
  const wsAudit = XLSX.utils.json_to_sheet(auditData);
  XLSX.utils.book_append_sheet(wb, wsAudit, 'AUDIT_LOG');

  return wb;
}

/**
 * Downloads the AlePortfolio database as an Excel (.xlsx) file in browser
 */
export function downloadDatabaseAsExcel(db: DatabaseState, filename: string = 'AlePortfolio_Database.xlsx'): void {
  const wb = buildAlePortfolioWorkbook(db);
  XLSX.writeFile(wb, filename);
}

/**
 * Parses an uploaded CSV or XLSX file containing transactions
 */
export function parseTransactionImportFile(fileData: ArrayBuffer | string): Partial<Transaction>[] {
  const wb = XLSX.read(fileData, { type: typeof fileData === 'string' ? 'string' : 'array' });
  const firstSheetName = wb.SheetNames[0];
  const worksheet = wb.Sheets[firstSheetName];
  const rows: any[] = XLSX.utils.sheet_to_json(worksheet);

  return rows.map((r, index) => {
    // Normalization across possible Brazilian/English column naming
    const date = r.date || r.Data || r.data || new Date().toISOString().slice(0, 10);
    const ticker = (r.ticker || r.Ativo || r.Código || r.Ticker || '').toUpperCase().trim();
    const typeStr = (r.type || r.Tipo || r.Operação || 'BUY').toUpperCase();
    const type = typeStr.includes('V') || typeStr.includes('SELL') ? 'SELL' : 'BUY';
    const quantity = Math.abs(parseFloat(r.quantity || r.Quantidade || r.Qtd || 0));
    const unitPrice = parseFloat(r.unit_price || r.Preço || r.Preco || r['Preço Médio'] || 0);
    const fees = parseFloat(r.fees || r.Taxas || r.Corretagem || 0);
    const emoluments = parseFloat(r.emoluments || r.Emolumentos || 0);
    const irrf = parseFloat(r.irrf || r.IRRF || 0);
    const broker = (r.broker || r.Corretora || (ticker.length <= 4 && !ticker.match(/\d/) ? 'NOMAD' : 'CLEAR')).toUpperCase();

    return {
      transaction_id: `IMP-${Date.now()}-${index}`,
      broker_id: broker.includes('NOMAD') ? 'NOMAD' : 'CLEAR',
      date: typeof date === 'string' ? date.slice(0, 10) : new Date().toISOString().slice(0, 10),
      ticker,
      type,
      trade_category: (r.trade_category || r.Categoria || 'SWING_TRADE') as any,
      quantity,
      unit_price: unitPrice,
      gross_value: quantity * unitPrice,
      brokerage_fees: fees,
      b3_emoluments: emoluments,
      irrf,
      net_value: type === 'BUY' ? quantity * unitPrice + fees + emoluments : quantity * unitPrice - fees - emoluments - irrf,
      currency: broker.includes('NOMAD') ? 'USD' : 'BRL',
      exchange_rate: broker.includes('NOMAD') ? 5.42 : 1.0,
      statement_ref: r.statement_ref || r['Nota de Corretagem'] || `IMPORT_${Date.now()}`,
      reconciliation_hash: `IMP_${broker}_${ticker}_${type}_${date}_${quantity}_${unitPrice}`
    };
  });
}
