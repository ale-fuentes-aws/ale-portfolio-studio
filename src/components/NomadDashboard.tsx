/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Globe,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Plus,
  Upload,
  Calendar,
  Wallet,
  Coins,
  ArrowRight
} from 'lucide-react';
import { formatUSD, formatBRL, formatPercent, formatDateBR } from '../utils/formatters';
import { DatabaseState, PortfolioSummary, Holding, Transaction } from '../types/portfolio';

interface NomadDashboardProps {
  summary: PortfolioSummary;
  dbState: DatabaseState;
  onAddTransaction: (tx: Partial<Transaction>) => void;
  onUpdateCash: (brokerId: string, cash: number) => void;
}

export const NomadDashboard: React.FC<NomadDashboardProps> = ({
  summary,
  dbState,
  onAddTransaction,
  onUpdateCash
}) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [isEditingCash, setIsEditingCash] = useState(false);
  const [cashInput, setCashInput] = useState(summary.nomad_summary.available_cash_usd.toString());

  // Form State
  const [txTicker, setTxTicker] = useState('VOO');
  const [txType, setTxType] = useState<'BUY' | 'SELL'>('BUY');
  const [txDate, setTxDate] = useState(new Date().toISOString().slice(0, 10));
  const [txQty, setTxQty] = useState('10');
  const [txPrice, setTxPrice] = useState('530.00');

  const nomadHoldings = dbState.holdings.filter((h) => h.broker_id === 'NOMAD');
  const nomadTransactions = dbState.transactions.filter((t) => t.broker_id === 'NOMAD');
  const nomadDividends = dbState.dividends.filter((d) => d.broker_id === 'NOMAD');

  const exchangeRate = summary.exchange_rate_usd_brl;

  const handleCashSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(cashInput);
    if (!isNaN(val) && val >= 0) {
      onUpdateCash('NOMAD', val);
      setIsEditingCash(false);
    }
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const qty = parseFloat(txQty);
    const price = parseFloat(txPrice);
    if (!qty || !price || !txTicker) return;

    onAddTransaction({
      broker_id: 'NOMAD',
      ticker: txTicker.toUpperCase().trim(),
      type: txType,
      trade_category: 'SWING_TRADE',
      date: txDate,
      quantity: qty,
      unit_price: price,
      gross_value: qty * price,
      brokerage_fees: 0,
      b3_emoluments: 0,
      irrf: 0,
      net_value: qty * price,
      currency: 'USD',
      exchange_rate: exchangeRate,
      reconciliation_hash: `NOMAD_${txTicker}_${txType}_${txDate}_${qty}_${price}`
    });

    setShowAddModal(false);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white rounded-2xl p-6 shadow-xl border border-blue-800">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="p-1.5 rounded-lg bg-blue-600 text-white">
                <Globe className="w-4 h-4" />
              </span>
              <span className="text-xs font-bold tracking-wider uppercase text-blue-200">
                Portfólio Internacional · Nomad Global
              </span>
              <span className="text-xs bg-blue-950/80 px-2 py-0.5 rounded text-blue-300 border border-blue-700">
                Moeda Nativa: Dólar Americano (USD)
              </span>
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight">
              {formatUSD(summary.nomad_summary.total_balance_usd)}
            </h1>
            <p className="text-xs sm:text-sm text-blue-200 mt-1">
              Valor Consolidado em Reais: <strong className="text-white font-mono">{formatBRL(summary.nomad_summary.total_converted_brl)}</strong> (câmbio R$ {exchangeRate.toFixed(4)})
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md transition-all"
            >
              <Plus className="w-4 h-4" />
              Nova Ordem (USD)
            </button>
          </div>
        </div>
      </div>

      {/* Nomad KPI Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">
            Valor em Ativos (USD)
          </span>
          <div className="text-2xl font-bold text-slate-900 dark:text-white">
            {formatUSD(summary.nomad_summary.portfolio_value_usd)}
          </div>
          <span className="text-xs text-slate-400 mt-1 block">
            ≈ {formatBRL(summary.nomad_summary.portfolio_value_usd * exchangeRate)}
          </span>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">
            Capital Investido (USD)
          </span>
          <div className="text-2xl font-bold text-slate-900 dark:text-white">
            {formatUSD(summary.nomad_summary.invested_usd)}
          </div>
          <span className="text-xs text-slate-400 mt-1 block">
            Custo médio em dólares
          </span>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">
            Retorno Não Realizado
          </span>
          <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
            {formatUSD(summary.nomad_summary.unrealized_pl_usd)}
          </div>
          <span className="text-xs text-emerald-600 font-semibold mt-1 block">
            {formatPercent(summary.nomad_summary.unrealized_pl_pct)}
          </span>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Caixa Disponível (USD)
            </span>
            <button
              onClick={() => setIsEditingCash(!isEditingCash)}
              className="text-xs text-blue-600 hover:underline font-medium"
            >
              Editar
            </button>
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white">
            {formatUSD(summary.nomad_summary.available_cash_usd)}
          </div>
          <span className="text-xs text-slate-400 mt-1 block">
            ≈ {formatBRL(summary.nomad_summary.available_cash_usd * exchangeRate)}
          </span>
        </div>
      </div>

      {/* Edit Cash Dialog */}
      {isEditingCash && (
        <form onSubmit={handleCashSubmit} className="bg-blue-50 dark:bg-slate-800/80 p-4 rounded-xl border border-blue-200 dark:border-blue-900 flex items-center gap-4">
          <div className="flex-1">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Saldo em Conta Corrente Nomad (USD)
            </label>
            <input
              type="number"
              step="0.01"
              value={cashInput}
              onChange={(e) => setCashInput(e.target.value)}
              className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 font-mono text-sm dark:text-white"
            />
          </div>
          <div className="flex gap-2 self-end">
            <button
              type="button"
              onClick={() => setIsEditingCash(false)}
              className="px-3 py-1.5 text-xs text-slate-500 hover:text-slate-700"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-700"
            >
              Salvar Saldo
            </button>
          </div>
        </form>
      )}

      {/* Active Holdings Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-base text-slate-900 dark:text-white">
              Ativos em Carteira (Stocks & ETFs Internacionais)
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Preço médio, cotação atual, valor de mercado em USD e conversão PTAX
            </p>
          </div>
          <span className="text-xs font-semibold text-slate-500">
            {nomadHoldings.length} posições abertas
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="py-3 px-4">Ativo</th>
                <th className="py-3 px-4">Classe</th>
                <th className="py-3 px-4 text-right">Qtd</th>
                <th className="py-3 px-4 text-right">Preço Médio (USD)</th>
                <th className="py-3 px-4 text-right">Cotação Atual (USD)</th>
                <th className="py-3 px-4 text-right">Valor Mercado (USD)</th>
                <th className="py-3 px-4 text-right">Valor em BRL</th>
                <th className="py-3 px-4 text-right">Lucro/Prejuízo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {nomadHoldings.map((h) => {
                const isPos = h.unrealized_pl >= 0;
                return (
                  <tr key={h.holding_id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                    <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">
                      <div className="flex items-center gap-2">
                        <span className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300 flex items-center justify-center font-mono font-bold text-xs">
                          {h.ticker.slice(0, 3)}
                        </span>
                        <div>
                          <div>{h.ticker}</div>
                          <span className="text-[11px] text-slate-400 font-normal">{h.name}</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-medium">
                        {h.asset_class === 'ETF_INTL' ? 'ETF Internacional' : 'Stock Americana'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-medium">
                      {h.quantity}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono text-slate-600 dark:text-slate-400">
                      {formatUSD(h.average_price)}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-semibold text-slate-900 dark:text-white">
                      {formatUSD(h.current_price)}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900 dark:text-white">
                      {formatUSD(h.market_value)}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono text-slate-500">
                      {formatBRL(h.market_value_brl)}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-bold">
                      <span className={isPos ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}>
                        {formatUSD(h.unrealized_pl)} ({formatPercent(h.unrealized_pl_pct)})
                      </span>
                    </td>
                  </tr>
                );
              })}
              {nomadHoldings.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400 text-sm">
                    Nenhum ativo internacional registrado na Nomad.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Dividends & Proventos History */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-5">
        <h3 className="font-bold text-base text-slate-900 dark:text-white mb-1 flex items-center gap-2">
          <Coins className="w-4 h-4 text-blue-500" />
          Histórico de Dividendos Recebidos (USD)
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
          Com retenção de 30% na fonte (US Withholding Tax) para investidores não residentes
        </p>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="py-2.5 px-3">Data</th>
                <th className="py-2.5 px-3">Ativo</th>
                <th className="py-2.5 px-3">Tipo</th>
                <th className="py-2.5 px-3 text-right">Valor Bruto</th>
                <th className="py-2.5 px-3 text-right">IR Retido EUA (30%)</th>
                <th className="py-2.5 px-3 text-right">Valor Líquido</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {nomadDividends.map((div) => (
                <tr key={div.dividend_id}>
                  <td className="py-2.5 px-3 text-slate-500">{formatDateBR(div.payment_date)}</td>
                  <td className="py-2.5 px-3 font-bold text-slate-900 dark:text-white">{div.ticker}</td>
                  <td className="py-2.5 px-3 text-slate-600">{div.type}</td>
                  <td className="py-2.5 px-3 text-right font-mono">{formatUSD(div.gross_amount)}</td>
                  <td className="py-2.5 px-3 text-right font-mono text-rose-500">-{formatUSD(div.withholding_tax)}</td>
                  <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                    {formatUSD(div.net_amount)}
                  </td>
                </tr>
              ))}
              {nomadDividends.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-4 text-center text-slate-400 text-xs">
                    Nenhum provento internacional registrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Transaction Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">
              Nova Ordem Nomad (USD)
            </h3>
            <form onSubmit={handleAddSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 block mb-1">
                  Ticker / Símbolo
                </label>
                <input
                  type="text"
                  required
                  value={txTicker}
                  onChange={(e) => setTxTicker(e.target.value.toUpperCase())}
                  placeholder="Ex: VOO, AAPL, MSFT"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 uppercase font-mono text-sm dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 block mb-1">
                    Operação
                  </label>
                  <select
                    value={txType}
                    onChange={(e) => setTxType(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm dark:text-white"
                  >
                    <option value="BUY">Compra (BUY)</option>
                    <option value="SELL">Venda (SELL)</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 block mb-1">
                    Data da Ordem
                  </label>
                  <input
                    type="date"
                    required
                    value={txDate}
                    onChange={(e) => setTxDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 block mb-1">
                    Quantidade
                  </label>
                  <input
                    type="number"
                    step="0.0001"
                    min="0.0001"
                    required
                    value={txQty}
                    onChange={(e) => setTxQty(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono text-sm dark:text-white"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 block mb-1">
                    Preço Unitário (USD)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    value={txPrice}
                    onChange={(e) => setTxPrice(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono text-sm dark:text-white"
                  />
                </div>
              </div>

              <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-500">Valor Total Estimado:</span>
                  <span className="font-bold text-slate-900 dark:text-white font-mono">
                    {formatUSD((parseFloat(txQty) || 0) * (parseFloat(txPrice) || 0))}
                  </span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Equivalente em BRL:</span>
                  <span className="font-mono">
                    {formatBRL((parseFloat(txQty) || 0) * (parseFloat(txPrice) || 0) * exchangeRate)}
                  </span>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-semibold rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow"
                >
                  Confirmar Lançamento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
