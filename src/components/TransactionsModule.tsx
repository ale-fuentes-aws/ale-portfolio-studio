/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  ArrowRightLeft,
  Plus,
  Upload,
  Search,
  Filter,
  Trash2,
  FileSpreadsheet,
  AlertCircle,
  CheckCircle2,
  Calendar,
  DollarSign
} from 'lucide-react';
import { formatBRL, formatUSD, formatDateBR } from '../utils/formatters';
import { parseTransactionImportFile } from '../utils/excelDatabase';
import { Transaction, BrokerId, TransactionType, DatabaseState } from '../types/portfolio';

interface TransactionsModuleProps {
  dbState: DatabaseState;
  onAddTransaction: (tx: Partial<Transaction>) => void;
  onDeleteTransaction: (id: string) => void;
  onBatchImport: (txs: any[]) => void;
}

export const TransactionsModule: React.FC<TransactionsModuleProps> = ({
  dbState,
  onAddTransaction,
  onDeleteTransaction,
  onBatchImport
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [brokerFilter, setBrokerFilter] = useState<'ALL' | BrokerId>('ALL');
  const [typeFilter, setTypeFilter] = useState<'ALL' | TransactionType>('ALL');

  // Modals
  const [showManualModal, setShowManualModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importPreview, setImportPreview] = useState<Partial<Transaction>[]>([]);
  const [importStatus, setImportStatus] = useState<string | null>(null);

  // Manual Form
  const [broker, setBroker] = useState<BrokerId>('CLEAR');
  const [ticker, setTicker] = useState('PETR4');
  const [type, setType] = useState<TransactionType>('BUY');
  const [category, setCategory] = useState<'SWING_TRADE' | 'DAY_TRADE'>('SWING_TRADE');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [qty, setQty] = useState('100');
  const [unitPrice, setUnitPrice] = useState('38.50');
  const [fees, setFees] = useState('1.50');
  const [statementRef, setStatementRef] = useState('');

  const currentRate = dbState.exchange_rates.find((r) => r.is_current)?.rate || 5.42;

  // Filtered transactions
  const filteredTransactions = dbState.transactions.filter((tx) => {
    const matchesSearch =
      tx.ticker.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (tx.statement_ref && tx.statement_ref.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesBroker = brokerFilter === 'ALL' || tx.broker_id === brokerFilter;
    const matchesType = typeFilter === 'ALL' || tx.type === typeFilter;
    return matchesSearch && matchesBroker && matchesType;
  });

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = parseFloat(qty);
    const p = parseFloat(unitPrice);
    const f = parseFloat(fees) || 0;
    if (!q || !p || !ticker) return;

    const gross = q * p;
    let irrf = 0;
    if (type === 'SELL' && broker === 'CLEAR') {
      irrf = category === 'DAY_TRADE' ? gross * 0.01 : gross * 0.00005;
      irrf = Math.round(irrf * 100) / 100;
    }

    const net = type === 'BUY' ? gross + f : gross - f - irrf;

    onAddTransaction({
      broker_id: broker,
      ticker: ticker.toUpperCase().trim(),
      type,
      trade_category: category,
      date,
      quantity: q,
      unit_price: p,
      gross_value: gross,
      brokerage_fees: 0,
      b3_emoluments: f,
      irrf,
      net_value: net,
      currency: broker === 'NOMAD' ? 'USD' : 'BRL',
      exchange_rate: broker === 'NOMAD' ? currentRate : 1.0,
      statement_ref: statementRef || `MANUAL-${Date.now()}`,
      reconciliation_hash: `${broker}_${ticker}_${type}_${date}_${q}_${p}`
    });

    setShowManualModal(false);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const buffer = evt.target?.result;
        if (buffer) {
          const parsed = parseTransactionImportFile(buffer as any);
          setImportPreview(parsed);
          setImportStatus(`${parsed.length} ordens identificadas no arquivo.`);
        }
      } catch (err: any) {
        setImportStatus(`Erro ao processar arquivo: ${err.message}`);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const confirmBatchImport = () => {
    if (importPreview.length > 0) {
      onBatchImport(importPreview);
      setShowImportModal(false);
      setImportPreview([]);
      setImportStatus(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 rounded-lg bg-emerald-600 text-white">
              <ArrowRightLeft className="w-4 h-4" />
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              Livro de Transações Centralizado
            </span>
          </div>
          <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white">
            Histórico & Reconciliação de Ordens
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Registro imutável de compras, vendas e proventos das contas Clear e Nomad com cálculo automático de preço médio e IRRF
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setShowImportModal(true)}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold border border-slate-200 dark:border-slate-700 transition-all shadow-sm"
          >
            <Upload className="w-4 h-4 text-emerald-500" />
            Importar Nota / Extrato
          </button>

          <button
            onClick={() => setShowManualModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md transition-all"
          >
            <Plus className="w-4 h-4" />
            Nova Transação
          </button>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por ativo, nota..."
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-semibold">
            <button
              onClick={() => setBrokerFilter('ALL')}
              className={`px-3 py-1 rounded-lg ${brokerFilter === 'ALL' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500'}`}
            >
              Todas Corretoras
            </button>
            <button
              onClick={() => setBrokerFilter('CLEAR')}
              className={`px-3 py-1 rounded-lg ${brokerFilter === 'CLEAR' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500'}`}
            >
              Clear (BRL)
            </button>
            <button
              onClick={() => setBrokerFilter('NOMAD')}
              className={`px-3 py-1 rounded-lg ${brokerFilter === 'NOMAD' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500'}`}
            >
              Nomad (USD)
            </button>
          </div>

          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-semibold">
            <button
              onClick={() => setTypeFilter('ALL')}
              className={`px-3 py-1 rounded-lg ${typeFilter === 'ALL' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500'}`}
            >
              Todos Tipos
            </button>
            <button
              onClick={() => setTypeFilter('BUY')}
              className={`px-3 py-1 rounded-lg ${typeFilter === 'BUY' ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm' : 'text-slate-500'}`}
            >
              Compras
            </button>
            <button
              onClick={() => setTypeFilter('SELL')}
              className={`px-3 py-1 rounded-lg ${typeFilter === 'SELL' ? 'bg-white dark:bg-slate-700 text-rose-600 dark:text-rose-400 shadow-sm' : 'text-slate-500'}`}
            >
              Vendas
            </button>
          </div>
        </div>
      </div>

      {/* Transaction Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="py-3 px-4">Data</th>
                <th className="py-3 px-4">Corretora</th>
                <th className="py-3 px-4">Ativo</th>
                <th className="py-3 px-4">Tipo</th>
                <th className="py-3 px-4">Modalidade</th>
                <th className="py-3 px-4 text-right">Qtd</th>
                <th className="py-3 px-4 text-right">Preço Unitário</th>
                <th className="py-3 px-4 text-right">Valor Líquido</th>
                <th className="py-3 px-4 text-right">P&L Realizado</th>
                <th className="py-3 px-4 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredTransactions.map((tx) => {
                const isBuy = tx.type === 'BUY';
                const isUsd = tx.currency === 'USD';
                return (
                  <tr key={tx.transaction_id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-400 font-mono">
                      {formatDateBR(tx.date)}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                        tx.broker_id === 'NOMAD'
                          ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300'
                          : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                      }`}>
                        {tx.broker_id}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-900 dark:text-white font-mono">
                      {tx.ticker}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`text-xs font-bold ${isBuy ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                        {isBuy ? 'COMPRA' : 'VENDA'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-500">
                      {tx.trade_category === 'DAY_TRADE' ? (
                        <span className="font-semibold text-purple-600 dark:text-purple-400">Day Trade</span>
                      ) : (
                        'Swing Trade'
                      )}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-medium">
                      {tx.quantity}
                    </td>
                    <td className="py-3 px-4 text-right font-mono">
                      {isUsd ? formatUSD(tx.unit_price) : formatBRL(tx.unit_price)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-900 dark:text-white">
                      {isUsd ? formatUSD(tx.net_value) : formatBRL(tx.net_value)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold">
                      {tx.type === 'SELL' && tx.realized_pl !== undefined ? (
                        <span className={tx.realized_pl >= 0 ? 'text-emerald-600' : 'text-rose-600'}>
                          {isUsd ? formatUSD(tx.realized_pl) : formatBRL(tx.realized_pl)}
                        </span>
                      ) : (
                        <span className="text-slate-400">--</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => {
                          if (confirm(`Remover transação ${tx.ticker} (${tx.date})?`)) {
                            onDeleteTransaction(tx.transaction_id);
                          }
                        }}
                        title="Remover transação"
                        className="p-1.5 text-slate-400 hover:text-rose-600 rounded transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
              {filteredTransactions.length === 0 && (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-slate-400 text-sm">
                    Nenhuma transação encontrada com os filtros selecionados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Manual Transaction Modal */}
      {showManualModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">
              Lançar Nova Ordem
            </h3>
            <form onSubmit={handleManualSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 block mb-1">
                    Corretora
                  </label>
                  <select
                    value={broker}
                    onChange={(e) => setBroker(e.target.value as BrokerId)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm dark:text-white"
                  >
                    <option value="CLEAR">CLEAR (Brasil - BRL)</option>
                    <option value="NOMAD">NOMAD (Internacional - USD)</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 block mb-1">
                    Ticker
                  </label>
                  <input
                    type="text"
                    required
                    value={ticker}
                    onChange={(e) => setTicker(e.target.value.toUpperCase())}
                    placeholder="PETR4, VOO, MXRF11"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 uppercase font-mono text-sm dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 block mb-1">
                    Operação
                  </label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as TransactionType)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm dark:text-white"
                  >
                    <option value="BUY">Compra (C)</option>
                    <option value="SELL">Venda (V)</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 block mb-1">
                    Modalidade
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm dark:text-white"
                  >
                    <option value="SWING_TRADE">Swing Trade</option>
                    <option value="DAY_TRADE">Day Trade</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 block mb-1">
                    Data
                  </label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 block mb-1">
                    Quantidade
                  </label>
                  <input
                    type="number"
                    step="any"
                    min="0.0001"
                    required
                    value={qty}
                    onChange={(e) => setQty(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono text-sm dark:text-white"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 block mb-1">
                    Preço ({broker === 'NOMAD' ? 'USD' : 'BRL'})
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    value={unitPrice}
                    onChange={(e) => setUnitPrice(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono text-sm dark:text-white"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 block mb-1">
                    Taxas / Emolumentos
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={fees}
                    onChange={(e) => setFees(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono text-sm dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 block mb-1">
                  Nº Nota de Corretagem / Referência (Opcional)
                </label>
                <input
                  type="text"
                  value={statementRef}
                  onChange={(e) => setStatementRef(e.target.value)}
                  placeholder="Ex: NOTA-14982-CLEAR"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm dark:text-white"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowManualModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow"
                >
                  Confirmar Lançamento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* File Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
              Importar Nota de Corretagem ou Planilha de Extrato
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              Envie arquivos em formato Excel (.xlsx), CSV ou JSON de Notas de Corretagem da Clear ou extratos Nomad. O sistema valida campos obrigatórios e evita transações duplicadas.
            </p>

            <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl p-6 text-center hover:border-emerald-500 transition-colors">
              <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
              <label className="cursor-pointer font-semibold text-xs text-emerald-600 hover:underline">
                <span>Clique para selecionar um arquivo</span>
                <input
                  type="file"
                  accept=".xlsx,.csv,.json"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
              <p className="text-[11px] text-slate-400 mt-1">
                Formatos aceitos: .xlsx, .csv, .json (com colunas Data, Ticker, Tipo, Quantidade, Preço)
              </p>
            </div>

            {importStatus && (
              <div className="mt-4 p-3 rounded-xl bg-slate-50 dark:bg-slate-800 text-xs text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                {importStatus}
              </div>
            )}

            {importPreview.length > 0 && (
              <div className="mt-4 max-h-48 overflow-y-auto border border-slate-200 dark:border-slate-800 rounded-xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 dark:bg-slate-800 font-semibold text-slate-500 sticky top-0">
                    <tr>
                      <th className="py-2 px-3">Data</th>
                      <th className="py-2 px-3">Corretora</th>
                      <th className="py-2 px-3">Ativo</th>
                      <th className="py-2 px-3">Tipo</th>
                      <th className="py-2 px-3 text-right">Qtd</th>
                      <th className="py-2 px-3 text-right">Preço</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {importPreview.slice(0, 10).map((r, i) => (
                      <tr key={i}>
                        <td className="py-1.5 px-3 font-mono">{r.date}</td>
                        <td className="py-1.5 px-3">{r.broker_id}</td>
                        <td className="py-1.5 px-3 font-bold font-mono">{r.ticker}</td>
                        <td className="py-1.5 px-3">{r.type}</td>
                        <td className="py-1.5 px-3 text-right font-mono">{r.quantity}</td>
                        <td className="py-1.5 px-3 text-right font-mono">{r.unit_price}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="flex justify-end gap-3 mt-6">
              <button
                type="button"
                onClick={() => {
                  setShowImportModal(false);
                  setImportPreview([]);
                  setImportStatus(null);
                }}
                className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={importPreview.length === 0}
                onClick={confirmBatchImport}
                className="px-5 py-2 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow disabled:opacity-50"
              >
                Confirmar Importação ({importPreview.length})
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
