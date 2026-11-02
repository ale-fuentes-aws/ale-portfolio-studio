/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  TrendingUp,
  Globe,
  Building2,
  PieChart,
  Receipt,
  FileSpreadsheet,
  Settings,
  ArrowRightLeft,
  AlertTriangle,
  Download,
  Moon,
  Sun,
  User,
  LogOut,
  RefreshCw,
  CheckCircle2
} from 'lucide-react';
import { formatBRL } from '../utils/formatters';
import { googleSignIn, logoutGoogle } from '../utils/googleSheetsSync';
import { downloadDatabaseAsExcel } from '../utils/excelDatabase';
import { DatabaseState, PortfolioSummary } from '../types/portfolio';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  summary: PortfolioSummary;
  dbState: DatabaseState;
  onRefreshData: () => void;
  onUpdateExchangeRate: (newRate: number) => void;
  isDarkMode: boolean;
  setIsDarkMode: (val: boolean) => void;
  googleUser: any;
  setGoogleUser: (user: any) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  summary,
  dbState,
  onRefreshData,
  onUpdateExchangeRate,
  isDarkMode,
  setIsDarkMode,
  googleUser,
  setGoogleUser
}) => {
  const [isEditingRate, setIsEditingRate] = useState(false);
  const [newRateInput, setNewRateInput] = useState(summary.exchange_rate_usd_brl.toString());
  const [isSyncing, setIsSyncing] = useState(false);

  const pendingDarf = dbState.darfs.find(
    (d) => d.status === 'DARF_PENDING_PAYMENT' || d.status === 'DARF_OVERDUE'
  );

  const handleRateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseFloat(newRateInput);
    if (!isNaN(parsed) && parsed > 0) {
      onUpdateExchangeRate(parsed);
      setIsEditingRate(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      setIsSyncing(true);
      const res = await googleSignIn();
      if (res) {
        setGoogleUser(res.user);
      }
    } catch (err) {
      console.error('Login failed:', err);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleGoogleLogout = async () => {
    await logoutGoogle();
    setGoogleUser(null);
  };

  const navItems = [
    { id: 'dashboard', label: 'Dashboard Consolidado', icon: TrendingUp },
    { id: 'nomad', label: 'NOMAD (USD)', icon: Globe, badge: 'US$' },
    { id: 'clear', label: 'CLEAR (BRL)', icon: Building2, badge: 'R$' },
    { id: 'allocation', label: 'Alocação & Metas', icon: PieChart },
    { id: 'transactions', label: 'Transações', icon: ArrowRightLeft },
    {
      id: 'taxes',
      label: 'Tributação & DARF',
      icon: Receipt,
      hasAlert: !!pendingDarf
    },
    { id: 'reports', label: 'Relatórios & Excel', icon: FileSpreadsheet },
    { id: 'settings', label: 'Configurações', icon: Settings }
  ];

  return (
    <header className="border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur sticky top-0 z-40 transition-colors">
      {/* Top Banner for Sample Data Mode */}
      {dbState.is_sample_data && (
        <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-1 text-xs text-amber-800 dark:text-amber-300 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            <span className="font-semibold">Ambiente de Demonstração:</span>
            <span>Exibindo dados fictícios de amostra claramente identificados para validação da arquitetura e cálculos tributários.</span>
          </div>
          <button
            onClick={() => setActiveTab('settings')}
            className="underline hover:text-amber-900 dark:hover:text-amber-100 font-medium"
          >
            Gerenciar Base / Iniciar Carteira Real
          </button>
        </div>
      )}

      {/* Main Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          {/* Logo & Platform Title */}
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setActiveTab('dashboard')}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 via-teal-600 to-cyan-500 flex items-center justify-center text-white shadow-md shadow-emerald-500/20 font-bold text-lg tracking-wider">
              AP
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-xl tracking-tight text-slate-900 dark:text-white">
                  AlePortfolio
                </span>
                <span className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800">
                  Brasil · BRL
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 hidden sm:block">
                Gestão Consolidada & Fiscal (Nomad · Clear)
              </p>
            </div>
          </div>

          {/* Quick Info & Action Chips */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* USD/BRL Currency Chip */}
            <div className="relative">
              <button
                onClick={() => setIsEditingRate(!isEditingRate)}
                title="Taxa de Câmbio USD/BRL utilizada para consolidação patrimonial"
                className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:border-emerald-500 transition-colors"
              >
                <Globe className="w-3.5 h-3.5 text-blue-500" />
                <span className="font-mono font-semibold">
                  USD/BRL: R$ {summary.exchange_rate_usd_brl.toFixed(4).replace('.', ',')}
                </span>
                <span className="text-[10px] text-slate-400 hidden md:inline">
                  ({summary.exchange_rate_date.split('-').reverse().join('/')})
                </span>
              </button>

              {/* Edit Rate Dropdown */}
              {isEditingRate && (
                <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 p-3 z-50">
                  <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 mb-2">
                    Atualizar Cotação USD/BRL
                  </p>
                  <form onSubmit={handleRateSubmit} className="space-y-2">
                    <input
                      type="number"
                      step="0.0001"
                      min="1"
                      value={newRateInput}
                      onChange={(e) => setNewRateInput(e.target.value)}
                      className="w-full px-2 py-1 text-sm rounded border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 dark:text-white font-mono"
                      placeholder="Ex: 5.4200"
                    />
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setIsEditingRate(false)}
                        className="px-2 py-1 text-xs text-slate-500 hover:text-slate-700"
                      >
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        className="px-2.5 py-1 text-xs font-medium rounded bg-emerald-600 text-white hover:bg-emerald-700"
                      >
                        Salvar Câmbio
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </div>

            {/* DARF Alert Indicator */}
            {pendingDarf && (
              <button
                onClick={() => setActiveTab('taxes')}
                className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 text-xs font-semibold border border-rose-200 dark:border-rose-900 hover:bg-rose-100 transition-colors animate-pulse"
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>DARF: {formatBRL(pendingDarf.amount_due)}</span>
              </button>
            )}

            {/* Google Sheets Account Sync Button */}
            {googleUser ? (
              <div className="flex items-center gap-2 pl-1 border-l border-slate-200 dark:border-slate-700">
                <span
                  title={`Conectado como ${googleUser.email}`}
                  className="flex items-center gap-1 text-xs font-medium text-slate-700 dark:text-slate-300 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-1 rounded border border-emerald-200 dark:border-emerald-800"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                  <span className="hidden md:inline max-w-[100px] truncate">{googleUser.email}</span>
                </span>
                <button
                  onClick={handleGoogleLogout}
                  title="Desconectar conta Google"
                  className="p-1.5 text-slate-400 hover:text-rose-600 rounded"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={handleGoogleLogin}
                disabled={isSyncing}
                title="Conectar Google Sheets para persistência na nuvem"
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-300 text-xs font-medium border border-blue-200 dark:border-blue-800 transition-colors"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-blue-500" />
                <span className="hidden md:inline">Google Sheets</span>
              </button>
            )}

            {/* Excel Quick Export */}
            <button
              onClick={() => downloadDatabaseAsExcel(dbState)}
              title="Baixar planilha completa AlePortfolio_Database.xlsx (13 abas)"
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-900 dark:bg-slate-100 hover:bg-slate-800 dark:hover:bg-white text-white dark:text-slate-900 text-xs font-medium transition-colors shadow-sm"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Exportar .xlsx</span>
            </button>

            {/* Dark Mode Toggle */}
            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              title={isDarkMode ? 'Mudar para tema claro' : 'Mudar para tema escuro'}
              className="p-2 rounded-lg text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Tab Navigation Menu */}
        <nav className="flex space-x-1 overflow-x-auto pb-2 scrollbar-none text-sm font-medium">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-emerald-600 text-white shadow-sm font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400 dark:text-slate-500'}`} />
                <span>{item.label}</span>
                {item.badge && (
                  <span
                    className={`text-[10px] px-1 py-0.2 rounded font-mono ${
                      isActive
                        ? 'bg-emerald-700 text-emerald-100'
                        : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
                {item.hasAlert && (
                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                )}
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
};
