/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { DatabaseState, PortfolioSummary, AllocationComparison, Transaction } from '../types/portfolio';
import { INITIAL_FICTITIOUS_DATABASE } from '../data/initialData';

const LOCAL_STORAGE_KEY = 'aleportfolio_local_cache';

export async function fetchPortfolioData(): Promise<{
  state: DatabaseState;
  summary: PortfolioSummary;
  allocationComparisons: AllocationComparison[];
}> {
  try {
    const res = await fetch('/api/portfolio');
    if (!res.ok) throw new Error('API response not ok');
    const data = await res.json();
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data.state));
    return data;
  } catch (err) {
    console.warn('API error, falling back to local cache or initial data:', err);
    const cached = localStorage.getItem(LOCAL_STORAGE_KEY);
    const state: DatabaseState = cached ? JSON.parse(cached) : INITIAL_FICTITIOUS_DATABASE;
    // Basic fallback return
    return {
      state,
      summary: {
        total_net_worth_brl: 171370.81,
        total_investments_usd: 12555.50,
        total_investments_brl_converted: 68050.81,
        total_investments_brl_native: 75530.00,
        total_portfolio_value_brl: 143580.81,
        total_invested_capital_brl: 137602.25,
        total_unrealized_pl_brl: 5978.56,
        total_unrealized_pl_pct: 4.35,
        total_realized_pl_brl: 2619.22,
        total_cash_brl_equivalent: 27789.90,
        exchange_rate_usd_brl: 5.42,
        exchange_rate_date: '2026-11-02',
        nomad_summary: {
          total_balance_usd: 14705.50,
          invested_usd: 11550.00,
          portfolio_value_usd: 12555.50,
          available_cash_usd: 2150.00,
          unrealized_pl_usd: 1005.50,
          unrealized_pl_pct: 8.71,
          total_converted_brl: 79703.81,
          allocation_pct_of_total: 46.51
        },
        clear_summary: {
          total_balance_brl: 94030.00,
          invested_brl: 75070.00,
          portfolio_value_brl: 75530.00,
          available_cash_brl: 18500.00,
          unrealized_pl_brl: 460.00,
          unrealized_pl_pct: 0.61,
          allocation_pct_of_total: 53.49,
          active_darf_status: 'DARF_PENDING_PAYMENT',
          pending_darf_amount_brl: 245.92
        }
      },
      allocationComparisons: []
    };
  }
}

export async function addTransactionApi(tx: Partial<Transaction>): Promise<boolean> {
  const res = await fetch('/api/portfolio/transaction', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(tx)
  });
  return res.ok;
}

export async function deleteTransactionApi(id: string): Promise<boolean> {
  const res = await fetch(`/api/portfolio/transaction/${id}`, {
    method: 'DELETE'
  });
  return res.ok;
}

export async function updateExchangeRateApi(rate: number, referenceDate?: string): Promise<boolean> {
  const res = await fetch('/api/portfolio/exchange-rate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rate, reference_date: referenceDate })
  });
  return res.ok;
}

export async function updateCashBalanceApi(brokerId: string, cash: number): Promise<boolean> {
  const res = await fetch('/api/portfolio/cash', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ broker_id: brokerId, available_cash: cash })
  });
  return res.ok;
}

export async function payDarfApi(darfId: string, paidAmount: number, paidDate: string, notes?: string): Promise<boolean> {
  const res = await fetch('/api/portfolio/darf-pay', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      darf_id: darfId,
      paid_amount: paidAmount,
      paid_date: paidDate,
      proof_reference: notes
    })
  });
  return res.ok;
}

export async function resetSampleDataApi(): Promise<boolean> {
  const res = await fetch('/api/portfolio/reset-sample', { method: 'POST' });
  return res.ok;
}

export async function clearAllPortfolioApi(): Promise<boolean> {
  const res = await fetch('/api/portfolio/clear-all', { method: 'POST' });
  return res.ok;
}

export async function batchImportTransactionsApi(transactions: any[]): Promise<{ success: boolean; count: number }> {
  const res = await fetch('/api/portfolio/import', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ transactions })
  });
  if (res.ok) {
    const data = await res.json();
    return { success: true, count: data.importedCount || transactions.length };
  }
  return { success: false, count: 0 };
}
