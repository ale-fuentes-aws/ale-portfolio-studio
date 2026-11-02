/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  FileSpreadsheet,
  Download,
  Printer,
  Table,
  CheckCircle2,
  TrendingUp,
  Globe,
  Building2,
  Receipt,
  Coins
} from 'lucide-react';
import { formatBRL, formatUSD, formatPercent, formatDateBR } from '../utils/formatters';
import { downloadDatabaseAsExcel } from '../utils/excelDatabase';
import { DatabaseState, PortfolioSummary } from '../types/portfolio';

interface ReportsModuleProps {
  summary: PortfolioSummary;
  dbState: DatabaseState;
}

export const ReportsModule: React.FC<ReportsModuleProps> = ({ summary, dbState }) => {
  const [selectedReport, setSelectedReport] = useState<
    'CONSOLIDATED' | 'NOMAD' | 'CLEAR' | 'TAXES' | 'DIVIDENDS'
  >('CONSOLIDATED');

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 rounded-lg bg-emerald-600 text-white">
              <FileSpreadsheet className="w-4 h-4" />
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              Central de Relatórios & Exportações
            </span>
          </div>
          <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white">
            Relatórios Financeiros e Planilha Excel
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Exporte o banco de dados completo com 13 abas estruturadas ou visualize demonstrativos consolidados prontos para impressão
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => downloadDatabaseAsExcel(dbState)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition-all"
          >
            <Download className="w-4 h-4" />
            Baixar Banco Completo (.xlsx)
          </button>

          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold border border-slate-200 dark:border-slate-700 transition-all shadow-sm"
          >
            <Printer className="w-4 h-4 text-slate-500" />
            Imprimir / Salvar PDF
          </button>
        </div>
      </div>

      {/* Report Selection Tabs */}
      <div className="flex space-x-1 overflow-x-auto pb-1 text-xs sm:text-sm font-semibold">
        {[
          { id: 'CONSOLIDATED', label: 'Demonstrativo Consolidado' },
          { id: 'NOMAD', label: 'Carteira Nomad (USD)' },
          { id: 'CLEAR', label: 'Carteira Clear (BRL)' },
          { id: 'TAXES', label: 'Demonstrativo Fiscal & DARF' },
          { id: 'DIVIDENDS', label: 'Histórico de Proventos' }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setSelectedReport(tab.id as any)}
            className={`px-4 py-2 rounded-xl whitespace-nowrap transition-all ${
              selectedReport === tab.id
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm font-bold'
                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Report Content View */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 space-y-6 print:shadow-none print:border-none print:p-0">
        {selectedReport === 'CONSOLIDATED' && (
          <div className="space-y-6">
            <div className="border-b border-slate-200 dark:border-slate-800 pb-4">
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                Demonstrativo de Patrimônio Líquido Consolidado
              </h3>
              <p className="text-xs text-slate-500">
                Posição consolidada em Real (BRL) na data de {new Date().toLocaleDateString('pt-BR')} · Cotação USD/BRL: R$ {summary.exchange_rate_usd_brl.toFixed(4)}
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl">
                <span className="text-slate-500 block">Patrimônio Líquido Total</span>
                <span className="text-base font-bold text-slate-900 dark:text-white">{formatBRL(summary.total_net_worth_brl)}</span>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl">
                <span className="text-slate-500 block">Capital Investido</span>
                <span className="text-base font-bold text-slate-900 dark:text-white">{formatBRL(summary.total_invested_capital_brl)}</span>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl">
                <span className="text-slate-500 block">Lucro Não Realizado</span>
                <span className="text-base font-bold text-emerald-600 dark:text-emerald-400">{formatBRL(summary.total_unrealized_pl_brl)} ({formatPercent(summary.total_unrealized_pl_pct)})</span>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl">
                <span className="text-slate-500 block">Caixa Total Equivalente</span>
                <span className="text-base font-bold text-slate-900 dark:text-white">{formatBRL(summary.total_cash_brl_equivalent)}</span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 font-semibold border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="py-2.5 px-3">Corretora</th>
                    <th className="py-2.5 px-3">Ativo</th>
                    <th className="py-2.5 px-3">Classe</th>
                    <th className="py-2.5 px-3 text-right">Qtd</th>
                    <th className="py-2.5 px-3 text-right">Preço Médio</th>
                    <th className="py-2.5 px-3 text-right">Cotação Atual</th>
                    <th className="py-2.5 px-3 text-right">Valor em BRL</th>
                    <th className="py-2.5 px-3 text-right">P&L (%)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {dbState.holdings.map((h) => (
                    <tr key={h.holding_id}>
                      <td className="py-2.5 px-3 font-semibold">{h.broker_id}</td>
                      <td className="py-2.5 px-3 font-bold font-mono text-slate-900 dark:text-white">{h.ticker}</td>
                      <td className="py-2.5 px-3 text-slate-500">{h.asset_class}</td>
                      <td className="py-2.5 px-3 text-right font-mono">{h.quantity}</td>
                      <td className="py-2.5 px-3 text-right font-mono">{h.currency === 'USD' ? formatUSD(h.average_price) : formatBRL(h.average_price)}</td>
                      <td className="py-2.5 px-3 text-right font-mono">{h.currency === 'USD' ? formatUSD(h.current_price) : formatBRL(h.current_price)}</td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold">{formatBRL(h.market_value_brl)}</td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-600">
                        {formatPercent(h.unrealized_pl_pct)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {selectedReport === 'TAXES' && (
          <div className="space-y-4">
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">
              Histórico de Fechamentos Tributários & DARFs
            </h3>
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 font-semibold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-2.5 px-3">Mês/Ano</th>
                  <th className="py-2.5 px-3">Código</th>
                  <th className="py-2.5 px-3 text-right">Valor Apurado</th>
                  <th className="py-2.5 px-3 text-right">Vencimento</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                  <th className="py-2.5 px-3">Detalhes do Fechamento</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {dbState.darfs.map((df) => (
                  <tr key={df.darf_id}>
                    <td className="py-2.5 px-3 font-mono font-bold">{df.period_reference}</td>
                    <td className="py-2.5 px-3 font-mono">6015</td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold">{formatBRL(df.amount_due)}</td>
                    <td className="py-2.5 px-3 text-right font-mono">{formatDateBR(df.due_date)}</td>
                    <td className="py-2.5 px-3 text-center font-semibold">
                      <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800">
                        {df.status}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-500 text-xs">{df.breakdown_summary}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {selectedReport === 'DIVIDENDS' && (
          <div className="space-y-4">
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">
              Histórico Consolidado de Proventos Recebidos
            </h3>
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 font-semibold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-2.5 px-3">Data</th>
                  <th className="py-2.5 px-3">Corretora</th>
                  <th className="py-2.5 px-3">Ativo</th>
                  <th className="py-2.5 px-3">Tipo</th>
                  <th className="py-2.5 px-3 text-right">Bruto</th>
                  <th className="py-2.5 px-3 text-right">Retenção</th>
                  <th className="py-2.5 px-3 text-right">Líquido Creditado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {dbState.dividends.map((div) => (
                  <tr key={div.dividend_id}>
                    <td className="py-2.5 px-3 font-mono">{formatDateBR(div.payment_date)}</td>
                    <td className="py-2.5 px-3 font-semibold">{div.broker_id}</td>
                    <td className="py-2.5 px-3 font-mono font-bold">{div.ticker}</td>
                    <td className="py-2.5 px-3">{div.type}</td>
                    <td className="py-2.5 px-3 text-right font-mono">{div.currency === 'USD' ? formatUSD(div.gross_amount) : formatBRL(div.gross_amount)}</td>
                    <td className="py-2.5 px-3 text-right font-mono text-rose-500">
                      {div.withholding_tax > 0 ? (div.currency === 'USD' ? `-${formatUSD(div.withholding_tax)}` : `-${formatBRL(div.withholding_tax)}`) : 'Isento'}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                      {div.currency === 'USD' ? formatUSD(div.net_amount) : formatBRL(div.net_amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
