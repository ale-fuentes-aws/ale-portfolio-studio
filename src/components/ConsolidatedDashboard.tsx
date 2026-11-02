/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Wallet,
  Globe,
  Building2,
  PieChart,
  ArrowUpRight,
  ShieldAlert,
  Coins,
  CheckCircle2,
  Clock,
  ExternalLink
} from 'lucide-react';
import { formatBRL, formatUSD, formatPercent } from '../utils/formatters';
import { DatabaseState, PortfolioSummary } from '../types/portfolio';

interface ConsolidatedDashboardProps {
  summary: PortfolioSummary;
  dbState: DatabaseState;
  onNavigate: (tab: string) => void;
}

export const ConsolidatedDashboard: React.FC<ConsolidatedDashboardProps> = ({
  summary,
  dbState,
  onNavigate
}) => {
  const isPositiveUnrealized = summary.total_unrealized_pl_brl >= 0;
  const isPositiveRealized = summary.total_realized_pl_brl >= 0;

  // Asset class breakdown calculation
  const assetClassTotals: Record<string, { label: string; valueBrl: number; color: string }> = {
    ACOES: { label: 'Ações Brasil (B3)', valueBrl: 0, color: 'bg-emerald-500' },
    FIIS: { label: 'Fundos Imobiliários (FIIs)', valueBrl: 0, color: 'bg-indigo-500' },
    ETF_INTL: { label: 'ETFs Internacionais (US)', valueBrl: 0, color: 'bg-blue-500' },
    STOCKS_US: { label: 'Stocks Americanas (US)', valueBrl: 0, color: 'bg-cyan-500' },
    FUTUROS: { label: 'Contratos Futuros (WIN/WDO)', valueBrl: 0, color: 'bg-purple-500' }
  };

  dbState.holdings.forEach((h) => {
    if (assetClassTotals[h.asset_class]) {
      assetClassTotals[h.asset_class].valueBrl += h.market_value_brl;
    }
  });

  const totalHoldingsValueBrl = Object.values(assetClassTotals).reduce(
    (acc, curr) => acc + curr.valueBrl,
    0
  );

  return (
    <div className="space-y-6">
      {/* Top Banner: Consolidation Currency Rules */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 text-white rounded-2xl p-6 shadow-xl border border-slate-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs uppercase font-bold tracking-wider text-emerald-400 bg-emerald-950/80 px-2.5 py-0.5 rounded-full border border-emerald-700">
                Moeda Base de Consolidação: Real Brasileiro (BRL)
              </span>
              <span className="text-xs text-slate-400 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                Cotação PTAX: {summary.exchange_rate_date.split('-').reverse().join('/')}
              </span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
              {formatBRL(summary.total_net_worth_brl)}
            </h1>
            <p className="text-sm text-slate-300 mt-1 flex items-center gap-2">
              <span>Patrimônio Líquido Total Consolidado</span>
              <span className="text-slate-500">·</span>
              <span className="text-slate-400">
                (Carteira: {formatBRL(summary.total_portfolio_value_brl)} + Caixa: {formatBRL(summary.total_cash_brl_equivalent)})
              </span>
            </p>
          </div>

          {/* Quick Metrics Badge Group */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="bg-slate-800/80 border border-slate-700 p-3 rounded-xl">
              <span className="text-[11px] text-slate-400 block font-medium">Investimentos Nomad</span>
              <span className="text-sm sm:text-base font-bold text-blue-400">
                {formatUSD(summary.total_investments_usd)}
              </span>
              <span className="text-[10px] text-slate-400 block">
                ≈ {formatBRL(summary.total_investments_brl_converted)}
              </span>
            </div>

            <div className="bg-slate-800/80 border border-slate-700 p-3 rounded-xl">
              <span className="text-[11px] text-slate-400 block font-medium">Investimentos Clear</span>
              <span className="text-sm sm:text-base font-bold text-emerald-400">
                {formatBRL(summary.total_investments_brl_native)}
              </span>
              <span className="text-[10px] text-slate-400 block">
                {summary.clear_summary.allocation_pct_of_total.toFixed(1)}% do Patrimônio
              </span>
            </div>

            <div className="col-span-2 sm:col-span-1 bg-slate-800/80 border border-slate-700 p-3 rounded-xl">
              <span className="text-[11px] text-slate-400 block font-medium">Cotação Câmbio Usada</span>
              <span className="text-sm sm:text-base font-bold font-mono text-cyan-400">
                US$ 1 = R$ {summary.exchange_rate_usd_brl.toFixed(4).replace('.', ',')}
              </span>
              <span className="text-[10px] text-emerald-400 block font-medium">
                Conversão Estrita Ativa
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Invested */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Capital Investido</span>
            <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white">
            {formatBRL(summary.total_invested_capital_brl)}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Custo total de aquisição ponderado
          </p>
        </div>

        {/* Unrealized P/L */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Lucro Não Realizado</span>
            <div className={`p-2 rounded-lg ${isPositiveUnrealized ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600' : 'bg-rose-50 dark:bg-rose-950/60 text-rose-600'}`}>
              {isPositiveUnrealized ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
            </div>
          </div>
          <div className={`text-2xl font-bold ${isPositiveUnrealized ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
            {formatBRL(summary.total_unrealized_pl_brl)}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1">
            <span className={`font-semibold ${isPositiveUnrealized ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
              {formatPercent(summary.total_unrealized_pl_pct)}
            </span>
            <span>sobre capital alocado</span>
          </p>
        </div>

        {/* Realized P/L */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Resultado Realizado</span>
            <div className={`p-2 rounded-lg ${isPositiveRealized ? 'bg-teal-50 dark:bg-teal-950/60 text-teal-600' : 'bg-rose-50 dark:bg-rose-950/60 text-rose-600'}`}>
              <Coins className="w-4 h-4" />
            </div>
          </div>
          <div className={`text-2xl font-bold ${isPositiveRealized ? 'text-teal-600 dark:text-teal-400' : 'text-rose-600 dark:text-rose-400'}`}>
            {formatBRL(summary.total_realized_pl_brl)}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Ganhos/perdas encerradas em vendas
          </p>
        </div>

        {/* Total Cash */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Caixa Disponível</span>
            <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white">
            {formatBRL(summary.total_cash_brl_equivalent)}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Nomad {formatUSD(summary.nomad_summary.available_cash_usd)} + Clear {formatBRL(summary.clear_summary.available_cash_brl)}
          </p>
        </div>
      </div>

      {/* Broker Highlights Cards: NOMAD vs CLEAR */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* NOMAD Card */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-2xl pointer-events-none" />
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold shadow-md shadow-blue-500/20">
                <Globe className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-lg text-slate-900 dark:text-white">
                  NOMAD Global
                </h3>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  Internacional · Estados Unidos · Moeda USD
                </span>
              </div>
            </div>
            <button
              onClick={() => onNavigate('nomad')}
              className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
            >
              Ver Carteira <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4 py-3 border-y border-slate-100 dark:border-slate-800 my-2">
            <div>
              <span className="text-xs text-slate-500 block">Saldo Total em Dólar</span>
              <span className="text-xl font-bold text-slate-900 dark:text-white">
                {formatUSD(summary.nomad_summary.total_balance_usd)}
              </span>
              <span className="text-xs text-slate-400 block">
                ≈ {formatBRL(summary.nomad_summary.total_converted_brl)}
              </span>
            </div>
            <div>
              <span className="text-xs text-slate-500 block">Posição em Carteira</span>
              <span className="text-xl font-bold text-slate-900 dark:text-white">
                {formatUSD(summary.nomad_summary.portfolio_value_usd)}
              </span>
              <span className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold block">
                {formatPercent(summary.nomad_summary.unrealized_pl_pct)} P&L ({formatUSD(summary.nomad_summary.unrealized_pl_usd)})
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400 pt-2">
            <span>Caixa Livre: <strong className="text-slate-900 dark:text-white">{formatUSD(summary.nomad_summary.available_cash_usd)}</strong></span>
            <span>Participação: <strong className="text-slate-900 dark:text-white">{summary.nomad_summary.allocation_pct_of_total.toFixed(1)}% do Patrimônio</strong></span>
          </div>
        </div>

        {/* CLEAR Card */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none" />
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold shadow-md shadow-emerald-500/20">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-lg text-slate-900 dark:text-white">
                  CLEAR Corretora
                </h3>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  Nacional · B3 Brasil · Moeda BRL
                </span>
              </div>
            </div>
            <button
              onClick={() => onNavigate('clear')}
              className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
            >
              Ver Carteira <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4 py-3 border-y border-slate-100 dark:border-slate-800 my-2">
            <div>
              <span className="text-xs text-slate-500 block">Saldo Total em Real</span>
              <span className="text-xl font-bold text-slate-900 dark:text-white">
                {formatBRL(summary.clear_summary.total_balance_brl)}
              </span>
              <span className="text-xs text-slate-400 block">
                {summary.clear_summary.allocation_pct_of_total.toFixed(1)}% do Patrimônio
              </span>
            </div>
            <div>
              <span className="text-xs text-slate-500 block">Posição em Carteira</span>
              <span className="text-xl font-bold text-slate-900 dark:text-white">
                {formatBRL(summary.clear_summary.portfolio_value_brl)}
              </span>
              <span className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold block">
                {formatPercent(summary.clear_summary.unrealized_pl_pct)} P&L ({formatBRL(summary.clear_summary.unrealized_pl_brl)})
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400 pt-2">
            <span>Caixa Livre: <strong className="text-slate-900 dark:text-white">{formatBRL(summary.clear_summary.available_cash_brl)}</strong></span>
            <div className="flex items-center gap-1">
              <span>Status DARF:</span>
              {summary.clear_summary.pending_darf_amount_brl > 0 ? (
                <span className="font-bold text-rose-600 bg-rose-50 dark:bg-rose-950/60 px-2 py-0.5 rounded border border-rose-200 dark:border-rose-900">
                  Pendente ({formatBRL(summary.clear_summary.pending_darf_amount_brl)})
                </span>
              ) : (
                <span className="font-semibold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-900 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Em dia
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Asset Distribution and Allocation Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Asset Class Distribution */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                <PieChart className="w-4 h-4 text-emerald-600" />
                Distribuição por Classe de Ativo
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Composição do patrimônio investido consolidado em BRL
              </p>
            </div>
            <button
              onClick={() => onNavigate('allocation')}
              className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline"
            >
              Configurar Metas de Alocação →
            </button>
          </div>

          {/* Stacked Progress Bar */}
          <div className="h-4 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden flex mb-6">
            {Object.entries(assetClassTotals).map(([key, item]) => {
              const pct = totalHoldingsValueBrl > 0 ? (item.valueBrl / totalHoldingsValueBrl) * 100 : 0;
              if (pct <= 0) return null;
              return (
                <div
                  key={key}
                  style={{ width: `${pct}%` }}
                  className={`${item.color} h-full transition-all`}
                  title={`${item.label}: ${pct.toFixed(1)}%`}
                />
              );
            })}
          </div>

          {/* Legend Table */}
          <div className="space-y-3">
            {Object.entries(assetClassTotals).map(([key, item]) => {
              const pct = totalHoldingsValueBrl > 0 ? (item.valueBrl / totalHoldingsValueBrl) * 100 : 0;
              return (
                <div key={key} className="flex items-center justify-between text-xs sm:text-sm">
                  <div className="flex items-center gap-2">
                    <span className={`w-3 h-3 rounded-full ${item.color}`} />
                    <span className="font-medium text-slate-700 dark:text-slate-300">{item.label}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="font-mono text-slate-900 dark:text-white font-semibold">
                      {formatBRL(item.valueBrl)}
                    </span>
                    <span className="w-12 text-right font-mono text-slate-500 font-medium">
                      {pct.toFixed(1)}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Quick Actions & Rebalancing Card */}
        <div className="bg-gradient-to-br from-emerald-900/10 via-teal-900/5 to-cyan-900/10 border border-emerald-500/20 rounded-2xl p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 font-bold text-sm mb-2">
              <Coins className="w-4 h-4" />
              Rebalanceamento Inteligente
            </div>
            <h4 className="font-extrabold text-lg text-slate-900 dark:text-white mb-2">
              Diretrizes de Alocação
            </h4>
            <p className="text-xs text-slate-600 dark:text-slate-400 mb-4 leading-relaxed">
              Priorize novos aportes para ativos abaixo da meta (UNDERWEIGHT). O motor calcula a distribuição ótima sem necessidade de vendas forçadas ou incidência tributária.
            </p>

            <div className="space-y-2 text-xs bg-white/70 dark:bg-slate-900/70 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
              <div className="flex justify-between">
                <span className="text-slate-500">Caixa Clear Livre:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{formatBRL(summary.clear_summary.available_cash_brl)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Caixa Nomad Livre:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{formatUSD(summary.nomad_summary.available_cash_usd)}</span>
              </div>
            </div>
          </div>

          <div className="pt-4 space-y-2">
            <button
              onClick={() => onNavigate('allocation')}
              className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs tracking-wide shadow-md shadow-emerald-600/20 transition-all text-center"
            >
              Simular Aporte & Rebalancear
            </button>
            <button
              onClick={() => onNavigate('transactions')}
              className="w-full py-2 px-4 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-medium text-xs border border-slate-200 dark:border-slate-700 transition-all text-center"
            >
              Registrar / Importar Transação
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
