/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  Holding,
  Transaction,
  Asset,
  Broker,
  CashBalance,
  ExchangeRate,
  PortfolioSummary,
  AllocationTarget,
  AllocationComparison,
  AssetClass
} from '../types/portfolio';

/**
 * Recalculates holdings and realized P&L from historical transactions using Weighted Average Cost
 */
export function recalculateHoldingsFromTransactions(
  transactions: Transaction[],
  assets: Asset[],
  exchangeRate: number
): { holdings: Holding[]; updatedTransactions: Transaction[] } {
  // Sort transactions chronologically
  const sortedTx = [...transactions].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  const assetMap = new Map(assets.map((a) => [a.ticker, a]));

  interface Tracker {
    ticker: string;
    broker_id: 'CLEAR' | 'NOMAD';
    quantity: number;
    totalInvested: number;
    averagePrice: number;
  }

  const trackers = new Map<string, Tracker>();
  const updatedTransactions: Transaction[] = [];

  for (const tx of sortedTx) {
    const key = `${tx.broker_id}_${tx.ticker}`;
    let tracker = trackers.get(key);
    if (!tracker) {
      tracker = {
        ticker: tx.ticker,
        broker_id: tx.broker_id,
        quantity: 0,
        totalInvested: 0,
        averagePrice: 0
      };
      trackers.set(key, tracker);
    }

    const txCopy = { ...tx };

    if (tx.type === 'BUY') {
      const buyCosts = (tx.brokerage_fees || 0) + (tx.b3_emoluments || 0);
      const totalBuyAmount = tx.quantity * tx.unit_price + buyCosts;
      const newQty = tracker.quantity + tx.quantity;
      const newInvested = tracker.totalInvested + totalBuyAmount;
      tracker.quantity = newQty;
      tracker.totalInvested = newInvested;
      tracker.averagePrice = newQty > 0 ? newInvested / newQty : 0;
      txCopy.realized_pl = 0;
    } else if (tx.type === 'SELL') {
      const sellCosts = (tx.brokerage_fees || 0) + (tx.b3_emoluments || 0);
      const costBasis = tx.quantity * tracker.averagePrice;
      const netSellProceeds = tx.quantity * tx.unit_price - sellCosts;
      const realizedPl = netSellProceeds - costBasis;

      txCopy.realized_pl = Math.round(realizedPl * 100) / 100;

      const newQty = Math.max(0, tracker.quantity - tx.quantity);
      tracker.quantity = newQty;
      tracker.totalInvested = newQty * tracker.averagePrice;
      if (newQty === 0) {
        tracker.averagePrice = 0;
      }
    }

    updatedTransactions.push(txCopy);
  }

  const holdings: Holding[] = [];

  trackers.forEach((tracker, key) => {
    if (tracker.quantity <= 0.00001) return;

    const asset = assetMap.get(tracker.ticker);
    const currentPrice = asset ? asset.current_price : tracker.averagePrice;
    const name = asset ? asset.name : tracker.ticker;
    const assetClass = (asset ? asset.asset_class : 'ACOES') as AssetClass;
    const currency = tracker.broker_id === 'NOMAD' ? 'USD' : 'BRL';

    const marketValue = tracker.quantity * currentPrice;
    const unrealizedPl = marketValue - tracker.totalInvested;
    const unrealizedPlPct =
      tracker.totalInvested > 0
        ? (unrealizedPl / tracker.totalInvested) * 100
        : 0;

    const marketValueBrl =
      currency === 'USD' ? marketValue * exchangeRate : marketValue;

    holdings.push({
      holding_id: key,
      broker_id: tracker.broker_id,
      ticker: tracker.ticker,
      name,
      asset_class: assetClass,
      quantity: tracker.quantity,
      average_price: Math.round(tracker.averagePrice * 100) / 100,
      total_invested: Math.round(tracker.totalInvested * 100) / 100,
      current_price: currentPrice,
      market_value: Math.round(marketValue * 100) / 100,
      unrealized_pl: Math.round(unrealizedPl * 100) / 100,
      unrealized_pl_pct: Math.round(unrealizedPlPct * 100) / 100,
      currency,
      market_value_brl: Math.round(marketValueBrl * 100) / 100
    });
  });

  return { holdings, updatedTransactions };
}

/**
 * Calculates consolidated portfolio summary indicators
 */
export function calculateConsolidatedSummary(
  holdings: Holding[],
  cashBalances: CashBalance[],
  exchangeRate: number,
  rateDate: string,
  transactions: Transaction[],
  pendingDarfAmount: number = 0,
  activeDarfStatus: any = 'NO_DARF_REQUIRED'
): PortfolioSummary {
  const nomadCash =
    cashBalances.find((c) => c.broker_id === 'NOMAD')?.available_cash || 0;
  const clearCash =
    cashBalances.find((c) => c.broker_id === 'CLEAR')?.available_cash || 0;

  const nomadHoldings = holdings.filter((h) => h.broker_id === 'NOMAD');
  const clearHoldings = holdings.filter((h) => h.broker_id === 'CLEAR');

  const nomadPortfolioValueUsd = nomadHoldings.reduce(
    (acc, h) => acc + h.market_value,
    0
  );
  const nomadInvestedUsd = nomadHoldings.reduce(
    (acc, h) => acc + h.total_invested,
    0
  );
  const nomadUnrealizedPlUsd = nomadPortfolioValueUsd - nomadInvestedUsd;
  const nomadUnrealizedPlPct =
    nomadInvestedUsd > 0 ? (nomadUnrealizedPlUsd / nomadInvestedUsd) * 100 : 0;
  const nomadTotalBalanceUsd = nomadPortfolioValueUsd + nomadCash;
  const nomadConvertedBrl = nomadTotalBalanceUsd * exchangeRate;

  const clearPortfolioValueBrl = clearHoldings.reduce(
    (acc, h) => acc + h.market_value,
    0
  );
  const clearInvestedBrl = clearHoldings.reduce(
    (acc, h) => acc + h.total_invested,
    0
  );
  const clearUnrealizedPlBrl = clearPortfolioValueBrl - clearInvestedBrl;
  const clearUnrealizedPlPct =
    clearInvestedBrl > 0 ? (clearUnrealizedPlBrl / clearInvestedBrl) * 100 : 0;
  const clearTotalBalanceBrl = clearPortfolioValueBrl + clearCash;

  const totalInvestmentsUsd = nomadPortfolioValueUsd;
  const totalInvestmentsBrlConverted = nomadPortfolioValueUsd * exchangeRate;
  const totalInvestmentsBrlNative = clearPortfolioValueBrl;
  const totalPortfolioValueBrl =
    totalInvestmentsBrlConverted + totalInvestmentsBrlNative;

  const totalCashBrlEquivalent = clearCash + nomadCash * exchangeRate;
  const totalNetWorthBrl = totalPortfolioValueBrl + totalCashBrlEquivalent;

  const totalInvestedCapitalBrl =
    clearInvestedBrl + nomadInvestedUsd * exchangeRate;
  const totalUnrealizedPlBrl =
    totalPortfolioValueBrl - totalInvestedCapitalBrl;
  const totalUnrealizedPlPct =
    totalInvestedCapitalBrl > 0
      ? (totalUnrealizedPlBrl / totalInvestedCapitalBrl) * 100
      : 0;

  // Realized profit/loss across all transactions
  const totalRealizedPlBrl = transactions.reduce((acc, tx) => {
    const pl = tx.realized_pl || 0;
    if (tx.currency === 'USD') {
      return acc + pl * (tx.exchange_rate || exchangeRate);
    }
    return acc + pl;
  }, 0);

  const nomadPctOfTotal =
    totalNetWorthBrl > 0 ? (nomadConvertedBrl / totalNetWorthBrl) * 100 : 0;
  const clearPctOfTotal =
    totalNetWorthBrl > 0 ? (clearTotalBalanceBrl / totalNetWorthBrl) * 100 : 0;

  return {
    total_net_worth_brl: Math.round(totalNetWorthBrl * 100) / 100,
    total_investments_usd: Math.round(totalInvestmentsUsd * 100) / 100,
    total_investments_brl_converted:
      Math.round(totalInvestmentsBrlConverted * 100) / 100,
    total_investments_brl_native:
      Math.round(totalInvestmentsBrlNative * 100) / 100,
    total_portfolio_value_brl: Math.round(totalPortfolioValueBrl * 100) / 100,
    total_invested_capital_brl: Math.round(totalInvestedCapitalBrl * 100) / 100,
    total_unrealized_pl_brl: Math.round(totalUnrealizedPlBrl * 100) / 100,
    total_unrealized_pl_pct: Math.round(totalUnrealizedPlPct * 100) / 100,
    total_realized_pl_brl: Math.round(totalRealizedPlBrl * 100) / 100,
    total_cash_brl_equivalent: Math.round(totalCashBrlEquivalent * 100) / 100,
    exchange_rate_usd_brl: exchangeRate,
    exchange_rate_date: rateDate,
    nomad_summary: {
      total_balance_usd: Math.round(nomadTotalBalanceUsd * 100) / 100,
      invested_usd: Math.round(nomadInvestedUsd * 100) / 100,
      portfolio_value_usd: Math.round(nomadPortfolioValueUsd * 100) / 100,
      available_cash_usd: Math.round(nomadCash * 100) / 100,
      unrealized_pl_usd: Math.round(nomadUnrealizedPlUsd * 100) / 100,
      unrealized_pl_pct: Math.round(nomadUnrealizedPlPct * 100) / 100,
      total_converted_brl: Math.round(nomadConvertedBrl * 100) / 100,
      allocation_pct_of_total: Math.round(nomadPctOfTotal * 100) / 100
    },
    clear_summary: {
      total_balance_brl: Math.round(clearTotalBalanceBrl * 100) / 100,
      invested_brl: Math.round(clearInvestedBrl * 100) / 100,
      portfolio_value_brl: Math.round(clearPortfolioValueBrl * 100) / 100,
      available_cash_brl: Math.round(clearCash * 100) / 100,
      unrealized_pl_brl: Math.round(clearUnrealizedPlBrl * 100) / 100,
      unrealized_pl_pct: Math.round(clearUnrealizedPlPct * 100) / 100,
      allocation_pct_of_total: Math.round(clearPctOfTotal * 100) / 100,
      active_darf_status: activeDarfStatus,
      pending_darf_amount_brl: pendingDarfAmount
    }
  };
}

/**
 * Computes allocation comparisons and rebalancing suggestions
 */
export function calculateAllocationComparisons(
  targets: AllocationTarget[],
  holdings: Holding[],
  cashBalances: CashBalance[],
  exchangeRate: number
): AllocationComparison[] {
  const nomadCashBrl =
    (cashBalances.find((c) => c.broker_id === 'NOMAD')?.available_cash || 0) *
    exchangeRate;
  const clearCashBrl =
    cashBalances.find((c) => c.broker_id === 'CLEAR')?.available_cash || 0;
  const totalCashBrl = nomadCashBrl + clearCashBrl;

  const totalInvestedBrl = holdings.reduce(
    (acc, h) => acc + h.market_value_brl,
    0
  );
  const totalNetWorthBrl = totalInvestedBrl + totalCashBrl;

  if (totalNetWorthBrl <= 0) return [];

  return targets.map((target) => {
    let currentValueBrl = 0;

    if (target.level === 'BROKER') {
      if (target.target_identifier === 'CLEAR') {
        const brokerHoldings = holdings
          .filter((h) => h.broker_id === 'CLEAR')
          .reduce((acc, h) => acc + h.market_value_brl, 0);
        currentValueBrl = brokerHoldings + clearCashBrl;
      } else if (target.target_identifier === 'NOMAD') {
        const brokerHoldings = holdings
          .filter((h) => h.broker_id === 'NOMAD')
          .reduce((acc, h) => acc + h.market_value_brl, 0);
        currentValueBrl = brokerHoldings + nomadCashBrl;
      }
    } else if (target.level === 'ASSET_CLASS') {
      currentValueBrl = holdings
        .filter((h) => h.asset_class === target.target_identifier)
        .reduce((acc, h) => acc + h.market_value_brl, 0);
    } else if (target.level === 'CASH') {
      currentValueBrl = totalCashBrl;
    } else if (target.level === 'INDIVIDUAL_ASSET') {
      const match = holdings.find((h) => h.ticker === target.target_identifier);
      currentValueBrl = match ? match.market_value_brl : 0;
    }

    const currentPct = (currentValueBrl / totalNetWorthBrl) * 100;
    const targetPct = target.target_percentage;
    const differencePp = currentPct - targetPct;
    const targetValueBrl = (targetPct / 100) * totalNetWorthBrl;
    const amountDifference = targetValueBrl - currentValueBrl;

    const absDiff = Math.abs(differencePp);
    let alertLevel: 'ON_TARGET' | 'WARNING' | 'CRITICAL' = 'ON_TARGET';

    if (absDiff >= target.tolerance_critical_pp) {
      alertLevel = 'CRITICAL';
    } else if (absDiff >= target.tolerance_warning_pp) {
      alertLevel = 'WARNING';
    }

    let suggestedAction: 'INVEST' | 'REDUCE' | 'ON_TARGET' = 'ON_TARGET';
    if (differencePp < -0.2) {
      suggestedAction = 'INVEST';
    } else if (differencePp > 0.2) {
      suggestedAction = 'REDUCE';
    }

    return {
      target_identifier: target.target_identifier,
      label: target.label,
      level: target.level,
      current_pct: Math.round(currentPct * 100) / 100,
      target_pct: targetPct,
      difference_pp: Math.round(differencePp * 100) / 100,
      current_value_brl: Math.round(currentValueBrl * 100) / 100,
      target_value_brl: Math.round(targetValueBrl * 100) / 100,
      suggested_action: suggestedAction,
      suggested_amount_brl: Math.round(Math.abs(amountDifference) * 100) / 100,
      alert_level: alertLevel
    };
  });
}

/**
 * Rebalancing simulator with new contributions
 * Prioritizes new contributions and available cash before recommending any sales!
 */
export function simulateRebalancingWithContribution(
  contributionBrl: number,
  comparisons: AllocationComparison[]
): {
  recommendations: Array<{
    identifier: string;
    label: string;
    allocatedContributionBrl: number;
    projectedPct: number;
    targetPct: number;
    sharesToBuyApprox?: number;
  }>;
  totalAllocated: number;
  remainingCash: number;
} {
  const underweight = comparisons.filter(
    (c) => c.suggested_action === 'INVEST' && c.level === 'ASSET_CLASS'
  );

  const totalDeficit = underweight.reduce(
    (acc, c) => acc + c.suggested_amount_brl,
    0
  );

  if (totalDeficit <= 0 || contributionBrl <= 0) {
    return {
      recommendations: [],
      totalAllocated: 0,
      remainingCash: contributionBrl
    };
  }

  let allocatedSum = 0;
  const recommendations = underweight.map((item) => {
    // Proportional allocation based on underweight gap
    const proportion = item.suggested_amount_brl / totalDeficit;
    const allocated = Math.min(
      item.suggested_amount_brl,
      contributionBrl * proportion
    );
    allocatedSum += allocated;

    return {
      identifier: item.target_identifier,
      label: item.label,
      allocatedContributionBrl: Math.round(allocated * 100) / 100,
      projectedPct:
        Math.round(
          ((item.current_value_brl + allocated) /
            (item.current_value_brl + item.suggested_amount_brl)) *
            100 *
            10
        ) / 10,
      targetPct: item.target_pct
    };
  });

  return {
    recommendations,
    totalAllocated: Math.round(allocatedSum * 100) / 100,
    remainingCash: Math.round((contributionBrl - allocatedSum) * 100) / 100
  };
}
