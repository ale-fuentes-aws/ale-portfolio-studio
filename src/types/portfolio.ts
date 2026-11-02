/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type BrokerId = 'CLEAR' | 'NOMAD';

export type AssetClass = 
  | 'ACOES' 
  | 'FIIS' 
  | 'ETF_INTL' 
  | 'STOCKS_US' 
  | 'FUTUROS' 
  | 'CASH';

export type TransactionType = 
  | 'BUY' 
  | 'SELL' 
  | 'DIVIDEND' 
  | 'DEPOSIT' 
  | 'WITHDRAWAL' 
  | 'FEE';

export type TradeCategory = 
  | 'SWING_TRADE' 
  | 'DAY_TRADE' 
  | 'NOT_APPLICABLE';

export type TaxCategory = 
  | 'ACOES_SWING' 
  | 'DAY_TRADE' 
  | 'FIIS' 
  | 'FUTUROS_SWING';

export type DarfStatus = 
  | 'NO_DARF_REQUIRED' 
  | 'DARF_TO_BE_ISSUED' 
  | 'DARF_PENDING_PAYMENT' 
  | 'DARF_PAID' 
  | 'DARF_OVERDUE';

export interface Broker {
  broker_id: BrokerId;
  name: string;
  country: 'BR' | 'US';
  base_currency: 'BRL' | 'USD';
  active: boolean;
  supported_asset_classes: string[];
  notes?: string;
}

export interface Asset {
  ticker: string;
  name: string;
  broker_id: BrokerId;
  asset_class: AssetClass;
  currency: 'BRL' | 'USD';
  current_price: number;
  price_updated_at: string;
  sector?: string;
}

export interface Holding {
  holding_id: string;
  broker_id: BrokerId;
  ticker: string;
  name: string;
  asset_class: AssetClass;
  quantity: number;
  average_price: number;
  total_invested: number;
  current_price: number;
  market_value: number;
  unrealized_pl: number;
  unrealized_pl_pct: number;
  currency: 'BRL' | 'USD';
  market_value_brl: number; // strictly converted
  weight_in_portfolio_pct?: number;
}

export interface Transaction {
  transaction_id: string;
  broker_id: BrokerId;
  date: string; // YYYY-MM-DD
  ticker: string;
  type: TransactionType;
  trade_category: TradeCategory;
  quantity: number;
  unit_price: number;
  gross_value: number;
  brokerage_fees: number;
  b3_emoluments: number;
  irrf: number;
  net_value: number;
  currency: 'BRL' | 'USD';
  exchange_rate: number;
  realized_pl?: number;
  statement_ref?: string;
  reconciliation_hash: string;
}

export interface AllocationTarget {
  allocation_id: string;
  level: 'BROKER' | 'ASSET_CLASS' | 'INDIVIDUAL_ASSET' | 'CASH';
  target_identifier: string; // e.g. "CLEAR", "ACOES", "PETR4"
  label: string;
  target_percentage: number; // e.g. 25.0
  tolerance_warning_pp: number; // e.g. 2.0
  tolerance_critical_pp: number; // e.g. 5.0
}

export interface AllocationComparison {
  target_identifier: string;
  label: string;
  level: 'BROKER' | 'ASSET_CLASS' | 'INDIVIDUAL_ASSET' | 'CASH';
  current_pct: number;
  target_pct: number;
  difference_pp: number;
  current_value_brl: number;
  target_value_brl: number;
  suggested_action: 'INVEST' | 'REDUCE' | 'ON_TARGET';
  suggested_amount_brl: number;
  alert_level: 'ON_TARGET' | 'WARNING' | 'CRITICAL';
}

export interface ExchangeRate {
  rate_id: string;
  currency_pair: 'USD/BRL';
  reference_date: string;
  rate: number;
  source: string;
  is_current: boolean;
}

export interface DividendRecord {
  dividend_id: string;
  broker_id: BrokerId;
  ticker: string;
  type: 'RENDIMENTO' | 'DIVIDENDO' | 'JCP';
  payment_date: string;
  gross_amount: number;
  withholding_tax: number;
  net_amount: number;
  currency: 'BRL' | 'USD';
}

export interface TaxMonthlyCalculation {
  tax_closing_id: string;
  year_month: string; // "YYYY-MM"
  broker_id: BrokerId;
  category: TaxCategory;
  category_label: string;
  total_sales_value: number;
  gross_profit_loss: number;
  deductible_costs: number;
  net_operational_result: number;
  exempt_sales_flag: boolean;
  previous_accumulated_loss: number;
  loss_compensated: number;
  remaining_accumulated_loss: number;
  taxable_base: number;
  tax_rate: number; // 0.15 or 0.20
  gross_tax_due: number;
  irrf_credits_deducted: number;
  prior_underminimum_tax: number;
  final_tax_due: number;
  closing_status: 'CLOSED' | 'PROVISIONAL';
  legal_reference: string;
}

export interface TaxLossRecord {
  loss_id: string;
  category: TaxCategory;
  year_month: string;
  beginning_loss_balance: number;
  loss_incurred_in_month: number;
  loss_compensated_in_month: number;
  ending_loss_balance: number;
}

export interface DarfRecord {
  darf_id: string;
  period_reference: string; // "YYYY-MM"
  tax_code: string; // "6015"
  tax_code_description: string;
  amount_due: number;
  due_date: string; // YYYY-MM-DD (last business day of following month)
  status: DarfStatus;
  paid_date?: string | null;
  paid_amount?: number | null;
  proof_reference?: string | null;
  breakdown_summary?: string;
  notes?: string;
}

export interface CashBalance {
  balance_id: string;
  broker_id: BrokerId;
  currency: 'BRL' | 'USD';
  available_cash: number;
  reserved_cash: number;
  last_updated: string;
}

export interface AuditLogEntry {
  log_id: string;
  timestamp: string;
  event_type: string;
  entity: string;
  details: string;
  operator: string;
}

export interface PortfolioSummary {
  total_net_worth_brl: number;
  total_investments_usd: number;
  total_investments_brl_converted: number;
  total_investments_brl_native: number;
  total_portfolio_value_brl: number;
  total_invested_capital_brl: number;
  total_unrealized_pl_brl: number;
  total_unrealized_pl_pct: number;
  total_realized_pl_brl: number;
  total_cash_brl_equivalent: number;
  exchange_rate_usd_brl: number;
  exchange_rate_date: string;
  nomad_summary: {
    total_balance_usd: number;
    invested_usd: number;
    portfolio_value_usd: number;
    available_cash_usd: number;
    unrealized_pl_usd: number;
    unrealized_pl_pct: number;
    total_converted_brl: number;
    allocation_pct_of_total: number;
  };
  clear_summary: {
    total_balance_brl: number;
    invested_brl: number;
    portfolio_value_brl: number;
    available_cash_brl: number;
    unrealized_pl_brl: number;
    unrealized_pl_pct: number;
    allocation_pct_of_total: number;
    active_darf_status: DarfStatus;
    pending_darf_amount_brl: number;
  };
}

export interface DatabaseState {
  brokers: Broker[];
  assets: Asset[];
  holdings: Holding[];
  transactions: Transaction[];
  allocations: AllocationTarget[];
  exchange_rates: ExchangeRate[];
  dividends: DividendRecord[];
  tax_monthly: TaxMonthlyCalculation[];
  tax_losses: TaxLossRecord[];
  darfs: DarfRecord[];
  cash_balances: CashBalance[];
  settings: Record<string, string>;
  audit_logs: AuditLogEntry[];
  is_sample_data: boolean;
}
