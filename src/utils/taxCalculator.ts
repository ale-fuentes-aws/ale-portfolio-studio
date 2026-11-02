/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  Transaction,
  TaxCategory,
  TaxMonthlyCalculation,
  TaxLossRecord,
  DarfRecord,
  DarfStatus
} from '../types/portfolio';

export interface TaxCalculationResult {
  monthlyCalculations: TaxMonthlyCalculation[];
  endingLosses: Record<TaxCategory, number>;
  darfRecord: DarfRecord | null;
  accumulatedCarryoverTax: number;
}

/**
 * Returns the last business day of the month following a given yearMonth (YYYY-MM).
 * For Brazilian calendar, checks weekend (Saturday/Sunday) and rolls back to Friday.
 */
export function getDarfDueDate(yearMonth: string): string {
  const [yearStr, monthStr] = yearMonth.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10); // 1-12

  // Month following
  const nextMonthDate = new Date(year, month, 1); // e.g. for Oct (month 10), new Date(year, 10, 1) is Nov 1
  const nextYear = nextMonthDate.getFullYear();
  const nextMonth = nextMonthDate.getMonth(); // 0-indexed, so 10 = Nov

  // Last day of next month: day 0 of month after next
  const lastDay = new Date(nextYear, nextMonth + 1, 0);

  // If weekend, roll back to Friday
  const dayOfWeek = lastDay.getDay(); // 0: Sun, 6: Sat
  if (dayOfWeek === 0) {
    lastDay.setDate(lastDay.getDate() - 2);
  } else if (dayOfWeek === 6) {
    lastDay.setDate(lastDay.getDate() - 1);
  }

  const yyyy = lastDay.getFullYear();
  const mm = String(lastDay.getMonth() + 1).padStart(2, '0');
  const dd = String(lastDay.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * Categorizes a CLEAR transaction for Brazilian tax purposes
 */
export function categorizeClearTransaction(
  tx: Transaction,
  assetClass: string
): TaxCategory {
  if (tx.trade_category === 'DAY_TRADE') {
    return 'DAY_TRADE';
  }
  if (assetClass === 'FIIS') {
    return 'FIIS';
  }
  if (assetClass === 'FUTUROS') {
    return 'FUTUROS_SWING';
  }
  return 'ACOES_SWING';
}

/**
 * Calculates Brazilian Tax Closing and DARF for a given month and broker (CLEAR)
 * Strictly follows Receita Federal do Brasil (IN RFB 1.585/2015, Lei 11.033/2004, Lei 14.754/2023)
 */
export function calculateBrazilianTaxForMonth(
  yearMonth: string,
  transactions: Transaction[],
  assetMap: Map<string, { asset_class: string }>,
  beginningLosses: Record<TaxCategory, number>,
  priorUnderminimumCarryover: number = 0
): TaxCalculationResult {
  // Filter CLEAR sell transactions for the given year-month
  const monthSells = transactions.filter((t) => {
    return (
      t.broker_id === 'CLEAR' &&
      t.type === 'SELL' &&
      t.date.startsWith(yearMonth)
    );
  });

  const categories: TaxCategory[] = [
    'ACOES_SWING',
    'DAY_TRADE',
    'FIIS',
    'FUTUROS_SWING'
  ];

  const categoryLabels: Record<TaxCategory, string> = {
    ACOES_SWING: 'Ações — Operações Comuns (Swing Trade)',
    DAY_TRADE: 'Day Trade (Todas as Classes)',
    FIIS: 'FIIs / Fiagros (Fundos Imobiliários)',
    FUTUROS_SWING: 'Mercado Futuro / Mini Contratos (Swing)'
  };

  const taxRates: Record<TaxCategory, number> = {
    ACOES_SWING: 0.15,
    DAY_TRADE: 0.20,
    FIIS: 0.20,
    FUTUROS_SWING: 0.15
  };

  const legalReferences: Record<TaxCategory, string> = {
    ACOES_SWING: 'Art. 56 a 60, IN RFB 1.585/2015 — Alíquota 15%. Isenção para vendas totais no mês <= R$ 20.000,00.',
    DAY_TRADE: 'Art. 65, IN RFB 1.585/2015 — Alíquota 20%. Sem faixa de isenção. Prejuízos compensam apenas Day Trade.',
    FIIS: 'Lei 8.668/1993 e IN RFB 1.585/2015 — Alíquota 20%. Sem faixa de isenção. Prejuízos compensam apenas FIIs.',
    FUTUROS_SWING: 'Art. 61, IN RFB 1.585/2015 — Alíquota 15% sobre ajuste diário líquido apurado.'
  };

  // Group sells by tax category
  const groupedSales: Record<
    TaxCategory,
    { totalSales: number; grossProfit: number; costs: number; irrf: number }
  > = {
    ACOES_SWING: { totalSales: 0, grossProfit: 0, costs: 0, irrf: 0 },
    DAY_TRADE: { totalSales: 0, grossProfit: 0, costs: 0, irrf: 0 },
    FIIS: { totalSales: 0, grossProfit: 0, costs: 0, irrf: 0 },
    FUTUROS_SWING: { totalSales: 0, grossProfit: 0, costs: 0, irrf: 0 }
  };

  monthSells.forEach((tx) => {
    const asset = assetMap.get(tx.ticker);
    const assetClass = asset ? asset.asset_class : 'ACOES';
    const cat = categorizeClearTransaction(tx, assetClass);

    groupedSales[cat].totalSales += tx.gross_value;
    groupedSales[cat].grossProfit += tx.realized_pl || 0;
    groupedSales[cat].costs += (tx.brokerage_fees || 0) + (tx.b3_emoluments || 0);
    groupedSales[cat].irrf += tx.irrf || 0;
  });

  // Calculate monthly calculations and update loss tracking
  const monthlyCalculations: TaxMonthlyCalculation[] = [];
  const endingLosses: Record<TaxCategory, number> = { ...beginningLosses };
  let totalGrossTaxDue = 0;
  let totalIrrfDeducted = 0;

  // Check 20k exemption for Ações Swing Trade
  const acoesTotalSales = groupedSales.ACOES_SWING.totalSales;
  const acoesIsExempt = acoesTotalSales <= 20000.0 && acoesTotalSales > 0;

  for (const cat of categories) {
    const data = groupedSales[cat];
    const prevLoss = beginningLosses[cat] || 0;
    const netOperationalResult = data.grossProfit - data.costs;

    let isExempt = false;
    let lossCompensated = 0;
    let taxableBase = 0;
    let grossTax = 0;
    let irrfDeducted = 0;
    let finalTaxDue = 0;
    let remLoss = prevLoss;

    if (cat === 'ACOES_SWING' && acoesIsExempt && netOperationalResult > 0) {
      // Exempt gain!
      isExempt = true;
      taxableBase = 0;
      grossTax = 0;
      finalTaxDue = 0;
      // Previous loss is NOT used up because the gain is already exempt
      remLoss = prevLoss;
    } else if (netOperationalResult > 0) {
      // Positive operational result
      if (prevLoss > 0) {
        lossCompensated = Math.min(prevLoss, netOperationalResult);
        taxableBase = Math.max(0, netOperationalResult - lossCompensated);
        remLoss = prevLoss - lossCompensated;
      } else {
        taxableBase = netOperationalResult;
        remLoss = 0;
      }

      const rate = taxRates[cat];
      grossTax = taxableBase * rate;
      irrfDeducted = Math.min(grossTax, data.irrf);
      finalTaxDue = Math.max(0, grossTax - irrfDeducted);
    } else if (netOperationalResult < 0) {
      // Incurred loss in this category
      const lossIncurred = Math.abs(netOperationalResult);
      remLoss = prevLoss + lossIncurred;
      taxableBase = 0;
      grossTax = 0;
      finalTaxDue = 0;
    }

    endingLosses[cat] = remLoss;
    totalGrossTaxDue += grossTax;
    totalIrrfDeducted += irrfDeducted;

    monthlyCalculations.push({
      tax_closing_id: `TAX-${yearMonth}-${cat}`,
      year_month: yearMonth,
      broker_id: 'CLEAR',
      category: cat,
      category_label: categoryLabels[cat],
      total_sales_value: data.totalSales,
      gross_profit_loss: data.grossProfit,
      deductible_costs: data.costs,
      net_operational_result: netOperationalResult,
      exempt_sales_flag: isExempt,
      previous_accumulated_loss: prevLoss,
      loss_compensated: lossCompensated,
      remaining_accumulated_loss: remLoss,
      taxable_base: taxableBase,
      tax_rate: taxRates[cat],
      gross_tax_due: grossTax,
      irrf_credits_deducted: irrfDeducted,
      prior_underminimum_tax: 0,
      final_tax_due: finalTaxDue,
      closing_status: 'CLOSED',
      legal_reference: legalReferences[cat]
    });
  }

  // Combined DARF calculation
  const monthlyTaxSum = monthlyCalculations.reduce(
    (sum, c) => sum + c.final_tax_due,
    0
  );
  const totalTaxWithCarryover = monthlyTaxSum + priorUnderminimumCarryover;

  let darfRecord: DarfRecord | null = null;
  let accumulatedCarryoverTax = 0;

  const dueDate = getDarfDueDate(yearMonth);
  const todayStr = new Date().toISOString().slice(0, 10);
  const isOverdue = todayStr > dueDate;

  if (totalTaxWithCarryover <= 0) {
    darfRecord = {
      darf_id: `DARF-${yearMonth}`,
      period_reference: yearMonth,
      tax_code: '6015',
      tax_code_description: 'Ganhos Líquidos em Operações em Bolsa - PF',
      amount_due: 0,
      due_date: dueDate,
      status: 'NO_DARF_REQUIRED',
      breakdown_summary: 'Sem imposto a recolher (operações isentas ou com prejuízo compensável).',
      notes: 'Resultado apurado dentro dos limites legais de isenção ou compensação.'
    };
  } else if (totalTaxWithCarryover < 10.0) {
    // Under minimum rule: R$ 10,00 floor (IN RFB 1.585/2015 Art. 60 § 1º)
    accumulatedCarryoverTax = totalTaxWithCarryover;
    darfRecord = {
      darf_id: `DARF-${yearMonth}`,
      period_reference: yearMonth,
      tax_code: '6015',
      tax_code_description: 'Ganhos Líquidos em Operações em Bolsa - PF',
      amount_due: totalTaxWithCarryover,
      due_date: dueDate,
      status: 'NO_DARF_REQUIRED',
      breakdown_summary: `Imposto apurado de R$ ${totalTaxWithCarryover.toFixed(2)} é inferior ao mínimo legal de R$ 10,00. Fica acumulado para o próximo período fiscal.`,
      notes: 'Acumulado para o mês seguinte conforme regra da Receita Federal.'
    };
  } else {
    // DARF must be paid!
    const status: DarfStatus = isOverdue
      ? 'DARF_OVERDUE'
      : 'DARF_PENDING_PAYMENT';

    darfRecord = {
      darf_id: `DARF-${yearMonth}`,
      period_reference: yearMonth,
      tax_code: '6015',
      tax_code_description: 'Ganhos Líquidos em Operações em Bolsa - PF',
      amount_due: Math.round(totalTaxWithCarryover * 100) / 100,
      due_date: dueDate,
      status: status,
      breakdown_summary: `Total devido: R$ ${totalTaxWithCarryover.toFixed(2)} (Ações Swing: R$ ${monthlyCalculations[0].final_tax_due.toFixed(2)}, Day Trade: R$ ${monthlyCalculations[1].final_tax_due.toFixed(2)}, FIIs: R$ ${monthlyCalculations[2].final_tax_due.toFixed(2)}).`,
      notes: `Vencimento em ${dueDate.split('-').reverse().join('/')}. Código de Receita: 6015.`
    };
  }

  return {
    monthlyCalculations,
    endingLosses,
    darfRecord,
    accumulatedCarryoverTax
  };
}
