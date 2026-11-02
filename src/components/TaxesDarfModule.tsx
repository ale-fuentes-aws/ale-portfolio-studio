/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Receipt,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Clock,
  ShieldCheck,
  FileText,
  DollarSign,
  Download,
  Info,
  ChevronRight,
  TrendingDown,
  Building2
} from 'lucide-react';
import {
  formatBRL,
  formatDateBR,
  formatYearMonthBR
} from '../utils/formatters';
import {
  DatabaseState,
  TaxMonthlyCalculation,
  DarfRecord,
  TaxLossRecord
} from '../types/portfolio';

interface TaxesDarfModuleProps {
  dbState: DatabaseState;
  onPayDarf: (
    darfId: string,
    paidAmount: number,
    paidDate: string,
    notes?: string
  ) => void;
}

export const TaxesDarfModule: React.FC<TaxesDarfModuleProps> = ({
  dbState,
  onPayDarf
}) => {
  // Available distinct months
  const availableMonths = Array.from(
    new Set([
      ...dbState.tax_monthly.map((tm) => tm.year_month),
      ...dbState.darfs.map((d) => d.period_reference)
    ])
  ).sort().reverse();

  const [selectedMonth, setSelectedMonth] = useState<string>(
    availableMonths[0] || '2026-10'
  );

  // Pay modal
  const [payingDarf, setPayingDarf] = useState<DarfRecord | null>(null);
  const [payDate, setPayDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [payAmount, setPayAmount] = useState('');
  const [payNotes, setPayNotes] = useState('Pagamento realizado via Internet Banking');

  // Filtered records for selected month
  const monthCalculations = dbState.tax_monthly.filter(
    (tm) => tm.year_month === selectedMonth
  );
  const monthDarf = dbState.darfs.find(
    (d) => d.period_reference === selectedMonth
  );

  const handleOpenPay = (darf: DarfRecord) => {
    setPayingDarf(darf);
    setPayAmount(darf.amount_due.toString());
  };

  const handleConfirmPay = (e: React.FormEvent) => {
    e.preventDefault();
    if (!payingDarf) return;
    const amt = parseFloat(payAmount) || payingDarf.amount_due;
    onPayDarf(payingDarf.darf_id, amt, payDate, payNotes);
    setPayingDarf(null);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner: Legislation & Compliance */}
      <div className="bg-gradient-to-r from-slate-900 via-rose-950/80 to-slate-900 text-white rounded-2xl p-6 shadow-xl border border-rose-900/50">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="p-1.5 rounded-lg bg-rose-600 text-white">
                <Receipt className="w-4 h-4" />
              </span>
              <span className="text-xs font-bold tracking-wider uppercase text-rose-300">
                Módulo Fiscal · Receita Federal do Brasil (RFB)
              </span>
              <span className="text-xs bg-rose-950/90 px-2 py-0.5 rounded text-rose-300 border border-rose-700">
                DARF Código 6015 · B3 Clear
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Apuração Mensal & Emissão de DARF
            </h1>
            <p className="text-xs sm:text-sm text-rose-200 mt-1 max-w-2xl leading-relaxed">
              Cálculo rigoroso de ganho líquido tributável conforme IN RFB 1.585/2015. Segregação estrita entre Swing Trade, Day Trade e FIIs, compensação de prejuízos acumulados e controle de retenção de IRRF.
            </p>
          </div>

          {/* Month Selector Dropdown */}
          <div className="bg-slate-900/90 p-3 rounded-xl border border-slate-700 self-start md:self-auto">
            <label className="text-[11px] text-slate-400 block font-semibold mb-1">
              Período de Apuração (Mês/Ano)
            </label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-600 text-white font-mono text-sm focus:outline-none focus:border-rose-500 font-bold"
            >
              {availableMonths.map((ym) => (
                <option key={ym} value={ym}>
                  {formatYearMonthBR(ym)} ({ym})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* DARF Status Guide Card */}
      {monthDarf && (
        <div className={`p-6 rounded-2xl border shadow-sm ${
          monthDarf.status === 'DARF_PAID'
            ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800'
            : monthDarf.status === 'DARF_OVERDUE'
            ? 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900'
            : monthDarf.status === 'DARF_PENDING_PAYMENT'
            ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900'
            : 'bg-slate-50 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800'
        }`}>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-start gap-4">
              <div className={`p-3 rounded-2xl ${
                monthDarf.status === 'DARF_PAID'
                  ? 'bg-emerald-600 text-white'
                  : monthDarf.status === 'DARF_OVERDUE'
                  ? 'bg-rose-600 text-white'
                  : monthDarf.status === 'DARF_PENDING_PAYMENT'
                  ? 'bg-amber-600 text-white'
                  : 'bg-slate-600 text-white'
              }`}>
                <Receipt className="w-6 h-6" />
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold font-mono uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Guia DARF · Código 6015 (Pessoa Física Bolsa)
                  </span>
                  <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                    monthDarf.status === 'DARF_PAID'
                      ? 'bg-emerald-200 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200'
                      : monthDarf.status === 'DARF_OVERDUE'
                      ? 'bg-rose-200 dark:bg-rose-900 text-rose-800 dark:text-rose-200'
                      : monthDarf.status === 'DARF_PENDING_PAYMENT'
                      ? 'bg-amber-200 dark:bg-amber-900 text-amber-800 dark:text-amber-200'
                      : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                  }`}>
                    {monthDarf.status === 'DARF_PAID' && 'PAGO / LIQUIDADO'}
                    {monthDarf.status === 'DARF_OVERDUE' && 'VENCIDO'}
                    {monthDarf.status === 'DARF_PENDING_PAYMENT' && 'AGUARDANDO PAGAMENTO'}
                    {monthDarf.status === 'NO_DARF_REQUIRED' && 'NÃO EXIGÍVEL'}
                  </span>
                </div>

                <div className="text-3xl font-extrabold text-slate-900 dark:text-white mt-1">
                  {formatBRL(monthDarf.amount_due)}
                </div>

                <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 max-w-xl">
                  {monthDarf.breakdown_summary}
                </p>

                <div className="flex flex-wrap items-center gap-4 mt-3 text-xs text-slate-500 dark:text-slate-400">
                  <span className="flex items-center gap-1 font-medium">
                    <Calendar className="w-3.5 h-3.5" />
                    Data de Vencimento: <strong className="text-slate-900 dark:text-white">{formatDateBR(monthDarf.due_date)}</strong>
                  </span>
                  {monthDarf.paid_date && (
                    <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Liquidado em: {formatDateBR(monthDarf.paid_date)}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Pay action */}
            {monthDarf.status !== 'DARF_PAID' && monthDarf.amount_due > 0 && (
              <div className="flex flex-col gap-2 self-start md:self-auto">
                <button
                  onClick={() => handleOpenPay(monthDarf)}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs tracking-wide shadow-md shadow-emerald-600/20 transition-all flex items-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Marcar como Pago / Liquidado
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Segregated Category Breakdown Cards */}
      <div>
        <h3 className="font-bold text-base text-slate-900 dark:text-white mb-3 flex items-center gap-2">
          <FileText className="w-4 h-4 text-rose-500" />
          Memória de Cálculo por Categoria Tributária ({formatYearMonthBR(selectedMonth)})
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {monthCalculations.map((calc) => {
            const isExempt = calc.exempt_sales_flag;
            const hasLoss = calc.net_operational_result < 0;
            const ratePct = (calc.tax_rate * 100).toFixed(0);

            return (
              <div
                key={calc.tax_closing_id}
                className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                      {calc.category_label}
                    </h4>
                    <span className="text-[11px] font-mono font-semibold text-slate-500">
                      Alíquota Legal: {ratePct}%
                    </span>
                  </div>
                  {isExempt ? (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                      ISENÇÃO ART. 59 (VENDAS ≤ R$ 20K)
                    </span>
                  ) : hasLoss ? (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                      PREJUÍZO ACUMULADO
                    </span>
                  ) : calc.final_tax_due > 0 ? (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-300 dark:border-rose-800">
                      IMPOSTO APURADO
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                      SEM IMPOSTO
                    </span>
                  )}
                </div>

                {/* Audit Steps */}
                <div className="space-y-1.5 text-xs bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Alienação Total no Mês:</span>
                    <span className="font-mono font-semibold text-slate-900 dark:text-white">
                      {formatBRL(calc.total_sales_value)}
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-slate-500">Resultado Operacional Bruto:</span>
                    <span className={`font-mono font-semibold ${calc.gross_profit_loss >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {formatBRL(calc.gross_profit_loss)}
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-slate-500">Custos Operacionais Dedutíveis (B3):</span>
                    <span className="font-mono text-slate-500">
                      -{formatBRL(calc.deductible_costs)}
                    </span>
                  </div>

                  <div className="flex justify-between border-t border-slate-200 dark:border-slate-700 pt-1">
                    <span className="text-slate-700 dark:text-slate-300 font-medium">Resultado Líquido do Mês:</span>
                    <span className={`font-mono font-bold ${calc.net_operational_result >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600'}`}>
                      {formatBRL(calc.net_operational_result)}
                    </span>
                  </div>

                  {calc.previous_accumulated_loss > 0 && (
                    <div className="flex justify-between text-indigo-600 dark:text-indigo-400">
                      <span>Prejuízo Compensado de Meses Anteriores:</span>
                      <span className="font-mono font-semibold">
                        -{formatBRL(calc.loss_compensated)}
                      </span>
                    </div>
                  )}

                  <div className="flex justify-between border-t border-slate-200 dark:border-slate-700 pt-1">
                    <span className="text-slate-700 dark:text-slate-300 font-semibold">Base de Cálculo Tributável:</span>
                    <span className="font-mono font-bold text-slate-900 dark:text-white">
                      {formatBRL(calc.taxable_base)}
                    </span>
                  </div>

                  {calc.irrf_credits_deducted > 0 && (
                    <div className="flex justify-between text-teal-600 dark:text-teal-400">
                      <span>Crédito IRRF Retido na Fonte (Dedo-Duro):</span>
                      <span className="font-mono font-semibold">
                        -{formatBRL(calc.irrf_credits_deducted)}
                      </span>
                    </div>
                  )}

                  <div className="flex justify-between border-t border-slate-200 dark:border-slate-700 pt-1.5 font-bold text-sm">
                    <span className="text-slate-900 dark:text-white">Imposto Devido da Categoria:</span>
                    <span className={`font-mono ${calc.final_tax_due > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600'}`}>
                      {formatBRL(calc.final_tax_due)}
                    </span>
                  </div>
                </div>

                <p className="text-[11px] text-slate-400 italic">
                  Fundamento: {calc.legal_reference}
                </p>
              </div>
            );
          })}

          {monthCalculations.length === 0 && (
            <div className="col-span-2 py-8 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 text-center text-slate-400 text-xs">
              Nenhuma apuração de venda Clear registrada para este mês.
            </div>
          )}
        </div>
      </div>

      {/* Accumulated Compensable Losses Ledger */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-5">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
              <TrendingDown className="w-4 h-4 text-indigo-500" />
              Livro de Prejuízos Compensáveis Acumulados
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Saldos segregados por modalidade disponíveis para abater futuros ganhos líquidos
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
            <span className="text-xs text-slate-500 block">Prejuízo Ações (Swing Trade)</span>
            <span className="text-lg font-bold font-mono text-indigo-600 dark:text-indigo-400">
              R$ 0,00
            </span>
            <span className="text-[11px] text-slate-400 block mt-0.5">Compensa apenas Swing Trade de Ações</span>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
            <span className="text-xs text-slate-500 block">Prejuízo Day Trade</span>
            <span className="text-lg font-bold font-mono text-indigo-600 dark:text-indigo-400">
              R$ 0,00
            </span>
            <span className="text-[11px] text-slate-400 block mt-0.5">Compensa estritamente operações Day Trade</span>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
            <span className="text-xs text-slate-500 block">Prejuízo FIIs / Fiagros</span>
            <span className="text-lg font-bold font-mono text-indigo-600 dark:text-indigo-400">
              R$ 0,00
            </span>
            <span className="text-[11px] text-slate-400 block mt-0.5">Compensa exclusivamente ganhos de cotas FII</span>
          </div>
        </div>
      </div>

      {/* Pay Modal */}
      {payingDarf && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
              Liquidar Guia DARF ({payingDarf.period_reference})
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Informe a data e o valor do pagamento para registrar a quitação definitiva da obrigação tributária.
            </p>

            <form onSubmit={handleConfirmPay} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 block mb-1">
                  Valor Pago (R$)
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono text-sm dark:text-white"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 block mb-1">
                  Data Efetiva do Pagamento
                </label>
                <input
                  type="date"
                  required
                  value={payDate}
                  onChange={(e) => setPayDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm dark:text-white"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 block mb-1">
                  Comprovante / Observações
                </label>
                <input
                  type="text"
                  value={payNotes}
                  onChange={(e) => setPayNotes(e.target.value)}
                  placeholder="Ex: Pago via app Nubank / Autenticação 8941..."
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm dark:text-white"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setPayingDarf(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow"
                >
                  Confirmar Quitação
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
