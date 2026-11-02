/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { ConsolidatedDashboard } from './components/ConsolidatedDashboard';
import { NomadDashboard } from './components/NomadDashboard';
import { ClearDashboard } from './components/ClearDashboard';
import { AllocationModule } from './components/AllocationModule';
import { TransactionsModule } from './components/TransactionsModule';
import { TaxesDarfModule } from './components/TaxesDarfModule';
import { ReportsModule } from './components/ReportsModule';
import { SettingsModule } from './components/SettingsModule';
import {
  fetchPortfolioData,
  addTransactionApi,
  deleteTransactionApi,
  updateExchangeRateApi,
  updateCashBalanceApi,
  payDarfApi,
  resetSampleDataApi,
  clearAllPortfolioApi,
  batchImportTransactionsApi
} from './utils/apiClient';
import { initAuth } from './utils/googleSheetsSync';
import { DatabaseState, PortfolioSummary, AllocationComparison, Transaction, AllocationTarget } from './types/portfolio';
import { INITIAL_FICTITIOUS_DATABASE } from './data/initialData';
import {
  calculateConsolidatedSummary,
  calculateAllocationComparisons
} from './utils/portfolioCalculations';

export default function App() {
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [isDarkMode, setIsDarkMode] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [googleUser, setGoogleUser] = useState<any>(null);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const [dbState, setDbState] = useState<DatabaseState>(INITIAL_FICTITIOUS_DATABASE);
  const [summary, setSummary] = useState<PortfolioSummary>(() => {
    return calculateConsolidatedSummary(
      INITIAL_FICTITIOUS_DATABASE.holdings,
      INITIAL_FICTITIOUS_DATABASE.cash_balances,
      5.42,
      '2026-11-02',
      INITIAL_FICTITIOUS_DATABASE.transactions,
      245.92,
      'DARF_PENDING_PAYMENT'
    );
  });
  const [allocationComparisons, setAllocationComparisons] = useState<AllocationComparison[]>(() => {
    return calculateAllocationComparisons(
      INITIAL_FICTITIOUS_DATABASE.allocations,
      INITIAL_FICTITIOUS_DATABASE.holdings,
      INITIAL_FICTITIOUS_DATABASE.cash_balances,
      5.42
    );
  });

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const loadData = async () => {
    try {
      setIsLoading(true);
      const data = await fetchPortfolioData();
      if (data && data.state) {
        setDbState(data.state);
        setSummary(data.summary);
        setAllocationComparisons(data.allocationComparisons);
      }
    } catch (err) {
      console.error('Failed to load portfolio:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    // Firebase Auth listener
    const unsubscribe = initAuth(
      (user) => setGoogleUser(user),
      () => setGoogleUser(null)
    );

    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, []);

  // Handlers
  const handleAddTransaction = async (tx: Partial<Transaction>) => {
    const ok = await addTransactionApi(tx);
    if (ok) {
      showToast('Transação registrada com sucesso!');
      await loadData();
    } else {
      showToast('Erro ao registrar transação', 'error');
    }
  };

  const handleDeleteTransaction = async (id: string) => {
    const ok = await deleteTransactionApi(id);
    if (ok) {
      showToast('Transação removida com sucesso!');
      await loadData();
    } else {
      showToast('Erro ao remover transação', 'error');
    }
  };

  const handleBatchImport = async (txs: any[]) => {
    const res = await batchImportTransactionsApi(txs);
    if (res.success) {
      showToast(`${res.count} transações importadas com sucesso!`);
      await loadData();
    } else {
      showToast('Erro ao importar transações', 'error');
    }
  };

  const handleUpdateExchangeRate = async (newRate: number, date?: string) => {
    const ok = await updateExchangeRateApi(newRate, date);
    if (ok) {
      showToast(`Taxa de câmbio atualizada para R$ ${newRate.toFixed(4)}`);
      await loadData();
    }
  };

  const handleUpdateCash = async (brokerId: string, cash: number) => {
    const ok = await updateCashBalanceApi(brokerId, cash);
    if (ok) {
      showToast(`Saldo de caixa da ${brokerId} atualizado!`);
      await loadData();
    }
  };

  const handlePayDarf = async (darfId: string, paidAmount: number, paidDate: string, notes?: string) => {
    const ok = await payDarfApi(darfId, paidAmount, paidDate, notes);
    if (ok) {
      showToast('Guia DARF marcada como quitada com sucesso!');
      await loadData();
    }
  };

  const handleResetSampleData = async () => {
    const ok = await resetSampleDataApi();
    if (ok) {
      showToast('Carteira de demonstração restaurada!');
      await loadData();
    }
  };

  const handleClearAllPortfolio = async () => {
    const ok = await clearAllPortfolioApi();
    if (ok) {
      showToast('Carteira limpa para novos lançamentos!');
      await loadData();
    }
  };

  const handleSaveTargets = async (newTargets: AllocationTarget[]) => {
    try {
      await fetch('/api/portfolio/rebalance-target', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targets: newTargets })
      });
      showToast('Metas de alocação salvas com sucesso!');
      await loadData();
    } catch (err) {
      showToast('Erro ao salvar metas', 'error');
    }
  };

  return (
    <div className={isDarkMode ? 'dark' : ''}>
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans transition-colors flex flex-col justify-between selection:bg-emerald-500 selection:text-white">
        <div>
          {/* Header & Main Navigation */}
          <Navbar
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            summary={summary}
            dbState={dbState}
            onRefreshData={loadData}
            onUpdateExchangeRate={handleUpdateExchangeRate}
            isDarkMode={isDarkMode}
            setIsDarkMode={setIsDarkMode}
            googleUser={googleUser}
            setGoogleUser={setGoogleUser}
          />

          {/* Toast Notification */}
          {notification && (
            <div className="fixed bottom-6 right-6 z-50 animate-bounce">
              <div
                className={`px-4 py-3 rounded-2xl shadow-xl text-xs font-bold text-white flex items-center gap-2 ${
                  notification.type === 'error'
                    ? 'bg-rose-600'
                    : notification.type === 'info'
                    ? 'bg-blue-600'
                    : 'bg-emerald-600'
                }`}
              >
                <span>{notification.message}</span>
              </div>
            </div>
          )}

          {/* Main Body Content */}
          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {activeTab === 'dashboard' && (
              <ConsolidatedDashboard
                summary={summary}
                dbState={dbState}
                onNavigate={(tab) => setActiveTab(tab)}
              />
            )}

            {activeTab === 'nomad' && (
              <NomadDashboard
                summary={summary}
                dbState={dbState}
                onAddTransaction={handleAddTransaction}
                onUpdateCash={handleUpdateCash}
              />
            )}

            {activeTab === 'clear' && (
              <ClearDashboard
                summary={summary}
                dbState={dbState}
                onAddTransaction={handleAddTransaction}
                onUpdateCash={handleUpdateCash}
                onNavigateToTaxes={() => setActiveTab('taxes')}
                onOpenImporter={() => setActiveTab('transactions')}
              />
            )}

            {activeTab === 'allocation' && (
              <AllocationModule
                summary={summary}
                dbState={dbState}
                allocationComparisons={allocationComparisons}
                onSaveTargets={handleSaveTargets}
              />
            )}

            {activeTab === 'transactions' && (
              <TransactionsModule
                dbState={dbState}
                onAddTransaction={handleAddTransaction}
                onDeleteTransaction={handleDeleteTransaction}
                onBatchImport={handleBatchImport}
              />
            )}

            {activeTab === 'taxes' && (
              <TaxesDarfModule
                dbState={dbState}
                onPayDarf={handlePayDarf}
              />
            )}

            {activeTab === 'reports' && (
              <ReportsModule
                summary={summary}
                dbState={dbState}
              />
            )}

            {activeTab === 'settings' && (
              <SettingsModule
                summary={summary}
                dbState={dbState}
                onRefreshData={loadData}
                onResetSampleData={handleResetSampleData}
                onClearAllPortfolio={handleClearAllPortfolio}
                onUpdateExchangeRate={handleUpdateExchangeRate}
                googleUser={googleUser}
                setGoogleUser={setGoogleUser}
              />
            )}
          </main>
        </div>

        {/* Global Footer */}
        <footer className="border-t border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 py-6 mt-12 text-xs text-slate-500 dark:text-slate-400">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-slate-900 dark:text-white">AlePortfolio</span>
              <span>— Plataforma de Gestão de Investimentos Pessoais</span>
            </div>
            <div className="flex items-center gap-4 text-[11px]">
              <span>Base: Brasil · Moeda Principal: BRL (R$) · Secundária: USD (US$)</span>
              <span>·</span>
              <span>Conformidade IN RFB 1.585/2015</span>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
