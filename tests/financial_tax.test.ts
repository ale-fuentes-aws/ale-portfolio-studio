/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  calculateBrazilianTaxForMonth,
  getDarfDueDate,
  categorizeClearTransaction
} from '../src/utils/taxCalculator.ts';
import {
  recalculateHoldingsFromTransactions,
  calculateConsolidatedSummary,
  simulateRebalancingWithContribution
} from '../src/utils/portfolioCalculations.ts';
import { Transaction, Asset, AllocationComparison } from '../src/types/portfolio.ts';

describe('AlePortfolio Financial & Brazilian Tax Engine Tests', () => {
  // Test 1: Weighted Average Cost on Buy and Realized P&L on Sell
  it('should correctly calculate Weighted Average Cost and Realized P&L', () => {
    const assets: Asset[] = [
      {
        ticker: 'PETR4',
        name: 'Petrobras PN',
        broker_id: 'CLEAR',
        asset_class: 'ACOES',
        currency: 'BRL',
        current_price: 40.0,
        price_updated_at: '2026-11-02T00:00:00Z'
      }
    ];

    const txs: Transaction[] = [
      {
        transaction_id: 'TX-1',
        broker_id: 'CLEAR',
        date: '2026-08-01',
        ticker: 'PETR4',
        type: 'BUY',
        trade_category: 'SWING_TRADE',
        quantity: 100,
        unit_price: 30.0,
        gross_value: 3000.0,
        brokerage_fees: 0,
        b3_emoluments: 0,
        irrf: 0,
        net_value: 3000.0,
        currency: 'BRL',
        exchange_rate: 1.0,
        reconciliation_hash: '1'
      },
      {
        transaction_id: 'TX-2',
        broker_id: 'CLEAR',
        date: '2026-08-15',
        ticker: 'PETR4',
        type: 'BUY',
        trade_category: 'SWING_TRADE',
        quantity: 100,
        unit_price: 40.0,
        gross_value: 4000.0,
        brokerage_fees: 0,
        b3_emoluments: 0,
        irrf: 0,
        net_value: 4000.0,
        currency: 'BRL',
        exchange_rate: 1.0,
        reconciliation_hash: '2'
      },
      {
        transaction_id: 'TX-3',
        broker_id: 'CLEAR',
        date: '2026-09-01',
        ticker: 'PETR4',
        type: 'SELL',
        trade_category: 'SWING_TRADE',
        quantity: 100,
        unit_price: 50.0,
        gross_value: 5000.0,
        brokerage_fees: 0,
        b3_emoluments: 0,
        irrf: 0.25,
        net_value: 4999.75,
        currency: 'BRL',
        exchange_rate: 1.0,
        reconciliation_hash: '3'
      }
    ];

    const { holdings, updatedTransactions } = recalculateHoldingsFromTransactions(
      txs,
      assets,
      5.42
    );

    // Initial avg price after 2 buys: (100*30 + 100*40) / 200 = 35.0
    // Sell 100 @ 50: cost basis = 100 * 35 = 3500; realized PL = 5000 - 3500 = 1500
    const sellTx = updatedTransactions.find((t) => t.type === 'SELL');
    assert.strictEqual(sellTx?.realized_pl, 1500.0);

    // Remaining holding: 100 shares @ avg 35.0, market value @ 40 = 4000.0
    const petrHolding = holdings.find((h) => h.ticker === 'PETR4');
    assert.strictEqual(petrHolding?.quantity, 100);
    assert.strictEqual(petrHolding?.average_price, 35.0);
    assert.strictEqual(petrHolding?.market_value, 4000.0);
    assert.strictEqual(petrHolding?.unrealized_pl, 500.0);
  });

  // Test 2: Receita Federal R$ 20.000 Exemption Rule for Ações Swing Trade
  it('should exempt Ações Swing Trade when monthly sales <= R$ 20.000', () => {
    const assetMap = new Map([
      ['VALE3', { asset_class: 'ACOES' }]
    ]);

    const txs: Transaction[] = [
      {
        transaction_id: 'TX-EXEMPT',
        broker_id: 'CLEAR',
        date: '2026-10-10',
        ticker: 'VALE3',
        type: 'SELL',
        trade_category: 'SWING_TRADE',
        quantity: 100,
        unit_price: 70.0,
        gross_value: 7000.0, // R$ 7.000 <= R$ 20.000 (Exempt!)
        brokerage_fees: 0,
        b3_emoluments: 2.1,
        irrf: 0.35,
        net_value: 6997.55,
        currency: 'BRL',
        exchange_rate: 1.0,
        realized_pl: 1000.0,
        reconciliation_hash: 'VALE_EXEMPT'
      }
    ];

    const result = calculateBrazilianTaxForMonth('2026-10', txs, assetMap as any, {
      ACOES_SWING: 0,
      DAY_TRADE: 0,
      FIIS: 0,
      FUTUROS_SWING: 0
    });

    const acoesCalc = result.monthlyCalculations.find((c) => c.category === 'ACOES_SWING');
    assert.strictEqual(acoesCalc?.exempt_sales_flag, true);
    assert.strictEqual(acoesCalc?.final_tax_due, 0);
    assert.strictEqual(result.darfRecord?.status, 'NO_DARF_REQUIRED');
  });

  // Test 3: Receita Federal Taxation when Ações sales > R$ 20.000 (15%)
  it('should tax Ações Swing Trade at 15% when monthly sales > R$ 20.000', () => {
    const assetMap = new Map([
      ['PETR4', { asset_class: 'ACOES' }]
    ]);

    const txs: Transaction[] = [
      {
        transaction_id: 'TX-TAXABLE',
        broker_id: 'CLEAR',
        date: '2026-10-20',
        ticker: 'PETR4',
        type: 'SELL',
        trade_category: 'SWING_TRADE',
        quantity: 1000,
        unit_price: 35.0,
        gross_value: 35000.0, // R$ 35.000 > R$ 20.000 (Taxable at 15%!)
        brokerage_fees: 0,
        b3_emoluments: 10.0,
        irrf: 1.75,
        net_value: 34988.25,
        currency: 'BRL',
        exchange_rate: 1.0,
        realized_pl: 5000.0, // Gross profit: 5000 - 10 = 4990 net
        reconciliation_hash: 'PETR_TAXABLE'
      }
    ];

    const result = calculateBrazilianTaxForMonth('2026-10', txs, assetMap as any, {
      ACOES_SWING: 0,
      DAY_TRADE: 0,
      FIIS: 0,
      FUTUROS_SWING: 0
    });

    const acoesCalc = result.monthlyCalculations.find((c) => c.category === 'ACOES_SWING');
    assert.strictEqual(acoesCalc?.exempt_sales_flag, false);
    // Net result: 5000 - 10 = 4990. Gross tax @ 15% = 748.50. Less IRRF 1.75 = 746.75
    assert.strictEqual(acoesCalc?.gross_tax_due, 748.5);
    assert.strictEqual(acoesCalc?.final_tax_due, 746.75);
    assert.strictEqual(result.darfRecord?.amount_due, 746.75);
  });

  // Test 4: Day Trade 20% Tax Rate and Zero Exemption
  it('should tax Day Trade at 20% with no sales threshold exemption', () => {
    const assetMap = new Map([
      ['WINZ26', { asset_class: 'FUTUROS' }]
    ]);

    const txs: Transaction[] = [
      {
        transaction_id: 'TX-DT',
        broker_id: 'CLEAR',
        date: '2026-10-22',
        ticker: 'WINZ26',
        type: 'SELL',
        trade_category: 'DAY_TRADE',
        quantity: 5,
        unit_price: 130000.0,
        gross_value: 1000.0, // Small sale, but Day Trade has NO 20k exemption!
        brokerage_fees: 0,
        b3_emoluments: 10.0,
        irrf: 10.0,
        net_value: 980.0,
        currency: 'BRL',
        exchange_rate: 1.0,
        realized_pl: 500.0, // Net: 500 - 10 = 490
        reconciliation_hash: 'DT_1'
      }
    ];

    const result = calculateBrazilianTaxForMonth('2026-10', txs, assetMap as any, {
      ACOES_SWING: 0,
      DAY_TRADE: 0,
      FIIS: 0,
      FUTUROS_SWING: 0
    });

    const dtCalc = result.monthlyCalculations.find((c) => c.category === 'DAY_TRADE');
    assert.strictEqual(dtCalc?.tax_rate, 0.20);
    // Base 490 * 0.20 = 98.00 gross tax. Less IRRF 10.00 = 88.00
    assert.strictEqual(dtCalc?.final_tax_due, 88.00);
  });

  // Test 5: Under R$ 10,00 Minimum DARF Floor Rule
  it('should carry over tax under R$ 10,00 without issuing DARF', () => {
    const assetMap = new Map([
      ['MXRF11', { asset_class: 'FIIS' }]
    ]);

    const txs: Transaction[] = [
      {
        transaction_id: 'TX-FII-MIN',
        broker_id: 'CLEAR',
        date: '2026-10-25',
        ticker: 'MXRF11',
        type: 'SELL',
        trade_category: 'SWING_TRADE',
        quantity: 10,
        unit_price: 10.50,
        gross_value: 105.0,
        brokerage_fees: 0,
        b3_emoluments: 0,
        irrf: 0,
        net_value: 105.0,
        currency: 'BRL',
        exchange_rate: 1.0,
        realized_pl: 25.0, // 25 * 0.20 = R$ 5.00 (< R$ 10.00!)
        reconciliation_hash: 'FII_MIN'
      }
    ];

    const result = calculateBrazilianTaxForMonth('2026-10', txs, assetMap as any, {
      ACOES_SWING: 0,
      DAY_TRADE: 0,
      FIIS: 0,
      FUTUROS_SWING: 0
    });

    assert.strictEqual(result.darfRecord?.status, 'NO_DARF_REQUIRED');
    assert.strictEqual(result.accumulatedCarryoverTax, 5.0);
  });

  // Test 6: Due Date Calculation (Last business day of following month)
  it('should correctly determine the DARF payment due date', () => {
    // For October 2026: following month is November 2026.
    // Nov 30, 2026 is Monday -> business day!
    const dueDateOct = getDarfDueDate('2026-10');
    assert.strictEqual(dueDateOct, '2026-11-30');

    // For January 2026: following month is February 2026.
    // Feb 28, 2026 is Saturday -> rolls back to Friday Feb 27!
    const dueDateJan = getDarfDueDate('2026-01');
    assert.strictEqual(dueDateJan, '2026-02-27');
  });

  // Test 7: Rebalancing Simulator Prioritizes New Contributions
  it('should allocate new capital into underweight assets without selling', () => {
    const comparisons: AllocationComparison[] = [
      {
        target_identifier: 'ACOES',
        label: 'Ações Brasil',
        level: 'ASSET_CLASS',
        current_pct: 20.0,
        target_pct: 25.0,
        difference_pp: -5.0,
        current_value_brl: 20000.0,
        target_value_brl: 25000.0,
        suggested_action: 'INVEST',
        suggested_amount_brl: 5000.0,
        alert_level: 'CRITICAL'
      },
      {
        target_identifier: 'FIIS',
        label: 'Fundos Imobiliários',
        level: 'ASSET_CLASS',
        current_pct: 25.0,
        target_pct: 20.0,
        difference_pp: +5.0,
        current_value_brl: 25000.0,
        target_value_brl: 20000.0,
        suggested_action: 'REDUCE',
        suggested_amount_brl: 5000.0,
        alert_level: 'CRITICAL'
      }
    ];

    const simulation = simulateRebalancingWithContribution(3000.0, comparisons);
    assert.strictEqual(simulation.totalAllocated, 3000.0);
    assert.strictEqual(simulation.recommendations.length, 1);
    assert.strictEqual(simulation.recommendations[0].identifier, 'ACOES');
    assert.strictEqual(simulation.recommendations[0].allocatedContributionBrl, 3000.0);
  });
});
