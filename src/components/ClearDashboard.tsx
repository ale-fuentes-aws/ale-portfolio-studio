/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Building2,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Plus,
  Upload,
  Calendar,
  Wallet,
  Receipt,
  AlertTriangle,
  CheckCircle2,
  FileText,
  Percent
} from 'lucide-react';
import { formatBRL, formatPercent, formatDateBR } from '../utils/formatters';
import { DatabaseState, PortfolioSummary, Holding, Transaction } from '../types/portfolio';

interface ClearDashboardProps {
  summary: PortfolioSummary;
  dbState: DatabaseState;
  onAddTransaction: (tx: Partial<Transaction>) => void;
  onUpdateCash: (brokerId: string, cash: number) => void;
  onNavigateToTaxes: () => void;
  onOpenImporter: () => void;
}

export const ClearDashboard: React.FC<ClearDashboardProps> = ({
  summary,
  dbState,
  onAddTransaction,
  onUpdateCash,
  onNavigateToTaxes,
  onOpenImporter
}) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [isEditingCash, setIsEditingCash] = useState(false);
  const [cashInput, setCashInput] = useState(summary.clear_summary.available_cash_brl.toString());

  // Form State
  const [txTicker, setTxTicker] = useState('PETR4');
  const [txType, setTxType] = useState<'BUY' | 'SELL'>('BUY');
  const [txCategory, setTxCategory] = useState<'SWING_TRADE' | 'DAY_TRADE'>('SWING_TRADE');
  const [txDate, setTxDate] = useState(new Date().toISOString().slice(0, 10));
  const [txQty, setTxQty] = useState('100');
  const [txPrice, setTxPrice] = useState('38.50');
  const [txEmoluments, setTxEmoluments] = useState('1.50');

  const clearHoldings = dbState.holdings.filter((h) => h.broker_id === 'CLEAR');
  const clearDividends = dbState.dividends.filter((d) => d.broker_id === 'CLEAR');

  const pendingDarf = dbState.darfs.find(
    (d) => d.status === 'DARF_PENDING_PAYMENT' || d.status === 'DARF_OVERDUE'
  );

  const handleCashSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(cashInput);
    if (!isNaN(val) && val >= 0) {
      onUpdateCash('CLEAR', val);
      setIsEditingCash(false);
    }
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const qty = parseFloat(txQty);
    const price = parseFloat(txPrice);
    const emoluments = parseFloat(txEmoluments) || 0;
    if (!qty || !price || !txTicker) return;

    const gross = qty * price;
    // Calculate IRRF preview for sales: 0.005% for swing or 1% for day trade
    let irrf = 0;
    if (txType === 'SELL') {
      irrf = txCategory === 'DAY_TRADE' ? gross * 0.01 : gross * 0.00005;
      irrf = Math.round(irrf * 100) / 100;
    }

    onAddTransaction({
      broker_id: 'CLEAR',
      ticker: txTicker.toUpperCase().trim(),
      type: txType,
      trade_category: txCategory,
      date: txDate,
      quantity: qty,
      unit_price: price,
      gross_value: gross,
      brokerage_fees: 0,
      b3_emoluments: emoluments,
      irrf,
      net_value: txType === 'BUY' ? gross + emoluments : gross - emoluments - irrf,
      currency: 'BRL',
      exchange_rate: 1.0,
      statement_ref: `MANUAL-${Date.now()}`,
      reconciliation_hash: `CLEAR_${txTicker}_${txType}_${txDate}_${qty}_${price}`
    });

    setShowAddModal(false);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 text-white rounded-2xl p-6 shadow-xl border border-emerald-800">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="p-1.5 rounded-lg bg-emerald-600 text-white">
                <Building2 className="w-4 h-4" />
              </span>
              <span className="text-xs font-bold tracking-wider uppercase text-emerald-200">
                Portfólio Nacional · Clear Corretora (B3)
              </span>
              <span className="text-xs bg-emerald-950/80 px-2 py-0.5 rounded text-emerald-300 border border-emerald-700">
                Moeda Nativa: Real Brasileiro (BRL)
              </span>
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight">
              {formatBRL(summary.clear_summary.total_balance_brl)}
            </h1>
            <p className="text-xs sm:text-sm text-emerald-200 mt-1">
              Participação: <strong className="text-white font-mono">{summary.clear_summary.allocation_pct_of_total.toFixed(1)}%</strong> do Patrimônio Total Consolidado
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={onOpenImporter}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold border border-slate-700 shadow-sm transition-all"
            >
              <Upload className="w-4 h-4 text-emerald-400" />
              Importar Nota de Corretagem
            </button>

            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-md transition-all"
            >
              <Plus className="w-4 h-4" />
              Nova Ordem (BRL)
            </button>
          </div>
        </div>
      </div>

      {/* DARF Status Alert Box */}
      <div className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm ${
        pendingDarf
          ? 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900 text-rose-900 dark:text-rose-200'
          : 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900 text-emerald-900 dark:text-emerald-200'
      }`}>
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-xl ${pendingDarf ? 'bg-rose-600 text-white' : 'bg-emerald-600 text-white'}`}>
            {pendingDarf ? <AlertTriangle className="w-5 h-5" /> : <CheckCircle2 className="w-5 h-5" />}
          </div>
          <div>
            <h4 className="font-bold text-sm">
              {pendingDarf ? 'Obrigação Tributária — DARF Pendente de Pagamento' : 'Situação Fiscal Regular — Sem DARF Pendente'}
            </h4>
            <p className="text-xs opacity-90">
              {pendingDarf
                ? `Guia ref. ${pendingDarf.period_reference}: ${formatBRL(pendingDarf.amount_due)} com vencimento no último dia útil (${formatDateBR(pendingDarf.due_date)}).`
                : 'Todas as operações encerradas estão isentas ou devidamente compensadas.'}
            </p>
          </div>
        </div>

        <button
          onClick={onNavigateToTaxes}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all self-start sm:self-auto ${
            pendingDarf
              ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-md shadow-rose-600/20'
              : 'bg-emerald-600 hover:bg-emerald-700 text-white'
          }`}
        >
          {pendingDarf ? 'Ver e Liquidar DARF →' : 'Consultar Apuração Mensal →'}
        </button>
      </div>

      {/* Clear KPI Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">
            Valor em Custódia (BRL)
          </span>
          <div className="text-2xl font-bold text-slate-900 dark:text-white">
            {formatBRL(summary.clear_summary.portfolio_value_brl)}
          </div>
          <span className="text-xs text-slate-400 mt-1 block">
            Ações B3, FIIs e Derivativos
          </span>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">
            Capital Investido (BRL)
          </span>
          <div className="text-2xl font-bold text-slate-900 dark:text-white">
            {formatBRL(summary.clear_summary.invested_brl)}
          </div>
          <span className="text-xs text-slate-400 mt-1 block">
            Custo médio de aquisição
          </span>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">
            Retorno Não Realizado
          </span>
          <div className={`text-2xl font-bold ${summary.clear_summary.unrealized_pl_brl >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600'}`}>
            {formatBRL(summary.clear_summary.unrealized_pl_brl)}
          </div>
          <span className="text-xs font-semibold mt-1 block text-emerald-600">
            {formatPercent(summary.clear_summary.unrealized_pl_pct)}
          </span>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Caixa Disponível
            </span>
            <button
              onClick={() => setIsEditingCash(!isEditingCash)}
              className="text-xs text-emerald-600 hover:underline font-medium"
            >
              Editar
            </button>
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white">
            {formatBRL(summary.clear_summary.available_cash_brl)}
          </div>
          <span className="text-xs text-slate-400 mt-1 block">
            Saldo livre na conta Clear
          </span>
        </div>
      </div>

      {/* Edit Cash Dialog */}
      {isEditingCash && (
        <form onSubmit={handleCashSubmit} className="bg-emerald-50 dark:bg-slate-800/80 p-4 rounded-xl border border-emerald-200 dark:border-emerald-900 flex items-center gap-4">
          <div className="flex-1">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Saldo em Conta Corrente Clear (BRL)
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
              className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700"
            >
              Salvar Saldo
            </button>
          </div>
        </form>
      )}

      {/* Clear Holdings Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-base text-slate-900 dark:text-white">
              Custódia em Carteira (Ações B3, FIIs e Contratos)
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Posições com custo médio ponderado, cotação e P&L não realizado
            </p>
          </div>
          <span className="text-xs font-semibold text-slate-500">
            {clearHoldings.length} posições abertas
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="py-3 px-4">Ativo</th>
                <th className="py-3 px-4">Classe</th>
                <th className="py-3 px-4 text-right">Quantidade</th>
                <th className="py-3 px-4 text-right">Preço Médio</th>
                <th className="py-3 px-4 text-right">Cotação Atual</th>
                <th className="py-3 px-4 text-right">Valor Investido</th>
                <th className="py-3 px-4 text-right">Valor de Mercado</th>
                <th className="py-3 px-4 text-right">Lucro/Prejuízo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {clearHoldings.map((h) => {
                const isPos = h.unrealized_pl >= 0;
                return (
                  <tr key={h.holding_id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                    <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">
                      <div className="flex items-center gap-2">
                        <span className={`w-8 h-8 rounded-lg flex items-center justify-center font-mono font-bold text-xs ${
                          h.asset_class === 'FIIS'
                            ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/70 dark:text-indigo-300'
                            : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300'
                        }`}>
                          {h.ticker.slice(0, 4)}
                        </span>
                        <div>
                          <div>{h.ticker}</div>
                          <span className="text-[11px] text-slate-400 font-normal">{h.name}</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${
                        h.asset_class === 'FIIS'
                          ? 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300'
                          : 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300'
                      }`}>
                        {h.asset_class === 'FIIS' ? 'Fundo Imobiliário' : 'Ação B3'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-medium">
                      {h.quantity}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono text-slate-600 dark:text-slate-400">
                      {formatBRL(h.average_price)}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-semibold text-slate-900 dark:text-white">
                      {formatBRL(h.current_price)}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono text-slate-600 dark:text-slate-400">
                      {formatBRL(h.total_invested)}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900 dark:text-white">
                      {formatBRL(h.market_value)}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-bold">
                      <span className={isPos ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}>
                        {formatBRL(h.unrealized_pl)} ({formatPercent(h.unrealized_pl_pct)})
                      </span>
                    </td>
                  </tr>
                );
              })}
              {clearHoldings.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400 text-sm">
                    Nenhum ativo nacional registrado na Clear Corretora.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Proventos / Rendimentos Clear */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-5">
        <h3 className="font-bold text-base text-slate-900 dark:text-white mb-1 flex items-center gap-2">
          <Receipt className="w-4 h-4 text-emerald-500" />
          Proventos & Rendimentos Recebidos (BRL)
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
          Dividendos de ações, juros sobre capital próprio (JCP) e rendimentos isentos de FIIs
        </p>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="py-2.5 px-3">Data Pagamento</th>
                <th className="py-2.5 px-3">Ativo</th>
                <th className="py-2.5 px-3">Tipo de Provento</th>
                <th className="py-2.5 px-3 text-right">Valor Bruto</th>
                <th className="py-2.5 px-3 text-right">IR Retido</th>
                <th className="py-2.5 px-3 text-right">Valor Líquido Creditado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {clearDividends.map((div) => (
                <tr key={div.dividend_id}>
                  <td className="py-2.5 px-3 text-slate-500">{formatDateBR(div.payment_date)}</td>
                  <td className="py-2.5 px-3 font-bold text-slate-900 dark:text-white">{div.ticker}</td>
                  <td className="py-2.5 px-3">
                    <span className="text-[11px] px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-medium">
                      {div.type}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono">{formatBRL(div.gross_amount)}</td>
                  <td className="py-2.5 px-3 text-right font-mono text-slate-400">
                    {div.withholding_tax > 0 ? `-${formatBRL(div.withholding_tax)}` : 'Isento'}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                    {formatBRL(div.net_amount)}
                  </td>
                </tr>
              ))}
              {clearDividends.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-4 text-center text-slate-400 text-xs">
                    Nenhum provento nacional registrado.
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
              Nova Ordem Clear (BRL)
            </h3>
            <form onSubmit={handleAddSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 block mb-1">
                    Ticker / Código
                  </label>
                  <input
                    type="text"
                    required
                    value={txTicker}
                    onChange={(e) => setTxTicker(e.target.value.toUpperCase())}
                    placeholder="PETR4, MXRF11, WINZ26"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 uppercase font-mono text-sm dark:text-white"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 block mb-1">
                    Modalidade
                  </label>
                  <select
                    value={txCategory}
                    onChange={(e) => setTxCategory(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm dark:text-white"
                  >
                    <option value="SWING_TRADE">Swing Trade (Normal)</option>
                    <option value="DAY_TRADE">Day Trade (Mesmo dia)</option>
                  </select>
                </div>
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
                    <option value="BUY">Compra (C)</option>
                    <option value="SELL">Venda (V)</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 block mb-1">
                    Data do Pregão
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
                    step="1"
                    min="1"
                    required
                    value={txQty}
                    onChange={(e) => setTxQty(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono text-sm dark:text-white"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 block mb-1">
                    Preço Unitário (R$)
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

              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 block mb-1">
                  Taxas B3 / Emolumentos (R$)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={txEmoluments}
                  onChange={(e) => setTxEmoluments(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono text-sm dark:text-white"
                />
              </div>

              <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-500">Valor Bruto:</span>
                  <span className="font-bold text-slate-900 dark:text-white font-mono">
                    {formatBRL((parseFloat(txQty) || 0) * (parseFloat(txPrice) || 0))}
                  </span>
                </div>
                {txType === 'SELL' && (
                  <div className="flex justify-between text-slate-400">
                    <span>IRRF Estimado na Fonte:</span>
                    <span className="font-mono text-rose-500">
                      {formatBRL(
                        txCategory === 'DAY_TRADE'
                          ? (parseFloat(txQty) || 0) * (parseFloat(txPrice) || 0) * 0.01
                          : (parseFloat(txQty) || 0) * (parseFloat(txPrice) || 0) * 0.00005
                      )}
                    </span>
                  </div>
                )}
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
                  className="px-5 py-2 text-xs font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow"
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
