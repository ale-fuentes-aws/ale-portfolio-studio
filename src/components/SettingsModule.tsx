/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Settings,
  FileSpreadsheet,
  HardDrive,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  FolderArchive,
  Download,
  Trash2,
  Globe,
  Database,
  Layers
} from 'lucide-react';
import { MermaidDiagrams } from './MermaidDiagrams';
import { downloadDatabaseAsExcel } from '../utils/excelDatabase';
import {
  findOrCreatePortfolioSpreadsheet,
  syncDatabaseToGoogleSheets,
  googleSignIn,
  logoutGoogle,
  getAccessToken
} from '../utils/googleSheetsSync';
import { DatabaseState, PortfolioSummary } from '../types/portfolio';

interface SettingsModuleProps {
  summary: PortfolioSummary;
  dbState: DatabaseState;
  onRefreshData: () => void;
  onResetSampleData: () => void;
  onClearAllPortfolio: () => void;
  onUpdateExchangeRate: (newRate: number, date?: string) => void;
  googleUser: any;
  setGoogleUser: (user: any) => void;
}

export const SettingsModule: React.FC<SettingsModuleProps> = ({
  summary,
  dbState,
  onRefreshData,
  onResetSampleData,
  onClearAllPortfolio,
  onUpdateExchangeRate,
  googleUser,
  setGoogleUser
}) => {
  const [isSyncingSheets, setIsSyncingSheets] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [sheetUrl, setSheetUrl] = useState<string | null>(null);

  // Exchange rate form
  const [rateVal, setRateVal] = useState(summary.exchange_rate_usd_brl.toString());
  const [rateDate, setRateDate] = useState(summary.exchange_rate_date);

  const handleRateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseFloat(rateVal);
    if (!isNaN(parsed) && parsed > 0) {
      onUpdateExchangeRate(parsed, rateDate);
    }
  };

  const handleGoogleSheetsSync = async () => {
    try {
      setIsSyncingSheets(true);
      setSyncMessage('Conectando ao Google Drive e autenticando token...');

      let token = await getAccessToken();
      if (!token) {
        const signin = await googleSignIn();
        if (signin) {
          setGoogleUser(signin.user);
          token = signin.accessToken;
        }
      }

      if (!token) {
        throw new Error('Autenticação com Google não concluída.');
      }

      setSyncMessage('Localizando ou criando planilha AlePortfolio_Database...');
      const sheetInfo = await findOrCreatePortfolioSpreadsheet(token);
      setSheetUrl(sheetInfo.url);

      setSyncMessage(`Gravando dados das 13 abas na planilha '${sheetInfo.title}'...`);
      const syncRes = await syncDatabaseToGoogleSheets(token, sheetInfo.spreadsheetId, dbState);

      setSyncMessage(
        `Sincronização concluída com sucesso! ${syncRes.updatedCells} células atualizadas nas 13 abas do Google Sheets.`
      );
    } catch (err: any) {
      console.error('Google Sheets Sync Error:', err);
      setSyncMessage(`Falha na sincronização: ${err.message}`);
    } finally {
      setIsSyncingSheets(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 rounded-lg bg-slate-800 dark:bg-slate-700 text-white">
              <Settings className="w-4 h-4" />
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Painel de Configuração & Persistência
            </span>
          </div>
          <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white">
            Persistência Google Sheets & Arquitetura Local
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Gerenciamento de sincronização em nuvem, arquivos da base local (/DB-Finc-AlePortfolio/), taxas de câmbio e diagramas técnicos
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => downloadDatabaseAsExcel(dbState)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold shadow transition-all"
          >
            <Download className="w-4 h-4" />
            Baixar AlePortfolio_Database.xlsx
          </button>
        </div>
      </div>

      {/* Grid: Google Sheets Cloud Sync & Local DB Storage */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Google Sheets API Card */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900 dark:text-white">
                    Persistência Google Sheets (Nuvem)
                  </h3>
                  <span className="text-xs text-slate-400">
                    Google Sheets API v4 + Google Drive
                  </span>
                </div>
              </div>

              {googleUser ? (
                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Conectado
                </span>
              ) : (
                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                  Não conectado
                </span>
              )}
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed mb-4">
              Sincroniza todas as 13 abas estruturadas (BROKERS, ASSETS, PORTFOLIO, TRANSACTIONS, ALLOCATIONS, TAX_MONTHLY, DARF, etc.) diretamente com a sua conta Google Drive.
            </p>

            {googleUser && (
              <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl text-xs space-y-1 mb-4">
                <div className="flex justify-between">
                  <span className="text-slate-500">Conta Google:</span>
                  <span className="font-bold text-slate-900 dark:text-white font-mono">{googleUser.email}</span>
                </div>
                {sheetUrl && (
                  <div className="flex justify-between items-center pt-1 border-t border-slate-200 dark:border-slate-700">
                    <span className="text-slate-500">Planilha no Drive:</span>
                    <a
                      href={sheetUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline flex items-center gap-1 font-semibold"
                    >
                      Abrir no Google Sheets <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                )}
              </div>
            )}

            {syncMessage && (
              <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 text-xs text-blue-900 dark:text-blue-200">
                {syncMessage}
              </div>
            )}
          </div>

          <div className="pt-2">
            <button
              onClick={handleGoogleSheetsSync}
              disabled={isSyncingSheets}
              className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs tracking-wide shadow-md shadow-blue-600/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isSyncingSheets ? 'animate-spin' : ''}`} />
              <span>{isSyncingSheets ? 'Sincronizando com Google Sheets...' : 'Sincronizar Carteira para o Google Sheets'}</span>
            </button>
          </div>
        </div>

        {/* Local Spreadsheet Database Card */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600">
                <HardDrive className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-base text-slate-900 dark:text-white">
                  Banco de Dados Local no Servidor
                </h3>
                <span className="text-xs text-slate-400 font-mono">
                  /DB-Finc-AlePortfolio/
                </span>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed mb-4">
              O backend Express mantém persistência local contínua em formato JSON e gera automaticamente a planilha Excel sincronizada na pasta do projeto.
            </p>

            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-800">
                <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">AlePortfolio_Database.xlsx</span>
                <span className="text-emerald-600 font-semibold">13 Abas Ativas</span>
              </div>
              <div className="flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-800">
                <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">database_schema.json</span>
                <span className="text-slate-500 font-mono">JSON Schema v1.0</span>
              </div>
              <div className="flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-800">
                <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">README_DATABASE.md</span>
                <span className="text-slate-500 font-mono">Documentação</span>
              </div>
            </div>
          </div>

          <div className="pt-2">
            <button
              onClick={() => downloadDatabaseAsExcel(dbState)}
              className="w-full py-2.5 px-4 rounded-xl bg-slate-900 dark:bg-slate-100 hover:bg-slate-800 dark:hover:bg-white text-white dark:text-slate-900 font-semibold text-xs tracking-wide shadow transition-all flex items-center justify-center gap-2"
            >
              <Download className="w-4 h-4" />
              <span>Baixar Arquivo Excel (.xlsx)</span>
            </button>
          </div>
        </div>
      </div>

      {/* Exchange Rate Config & Data State Management */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Exchange Rate Card */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center gap-2">
            <Globe className="w-5 h-5 text-blue-500" />
            <h3 className="font-bold text-base text-slate-900 dark:text-white">
              Cotação Cambial USD/BRL
            </h3>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Taxa cambial estritamente aplicada para consolidar a carteira Nomad (USD) em Reais (BRL).
          </p>

          <form onSubmit={handleRateSubmit} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 block mb-1">
                  Taxa (R$ por US$ 1.00)
                </label>
                <input
                  type="number"
                  step="0.0001"
                  required
                  value={rateVal}
                  onChange={(e) => setRateVal(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono text-sm dark:text-white"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 block mb-1">
                  Data de Referência
                </label>
                <input
                  type="date"
                  required
                  value={rateDate}
                  onChange={(e) => setRateDate(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm dark:text-white"
                />
              </div>
            </div>

            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-slate-800 dark:bg-slate-700 hover:bg-slate-900 text-white text-xs font-semibold"
            >
              Atualizar Taxa Cambial
            </button>
          </form>
        </div>

        {/* Database State Controls: Sample Data vs Clean Reset */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center gap-2">
            <Database className="w-5 h-5 text-indigo-500" />
            <h3 className="font-bold text-base text-slate-900 dark:text-white">
              Gestão de Dados & Demonstração
            </h3>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Alterne entre o ambiente de validação (dados fictícios de amostra) e uma carteira limpa pronta para seus lançamentos reais.
          </p>

          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900">
              <div>
                <span className="font-bold text-xs text-amber-900 dark:text-amber-200 block">
                  Restaurar Dados Fictícios de Demonstração
                </span>
                <span className="text-[11px] text-amber-700 dark:text-amber-400">
                  Carrega carteira completa com histórico Clear e Nomad para testar cálculos
                </span>
              </div>
              <button
                onClick={() => {
                  if (confirm('Restaurar dados de amostra para demonstração?')) {
                    onResetSampleData();
                  }
                }}
                className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs whitespace-nowrap"
              >
                Restaurar Amostra
              </button>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900">
              <div>
                <span className="font-bold text-xs text-rose-900 dark:text-rose-200 block">
                  Limpar Carteira / Iniciar Carteira Real
                </span>
                <span className="text-[11px] text-rose-700 dark:text-rose-400">
                  Zera transações e custódia para iniciar o registro da sua carteira pessoal
                </span>
              </div>
              <button
                onClick={() => {
                  if (confirm('Atenção: Deseja zerar todas as transações e posições para começar do zero?')) {
                    onClearAllPortfolio();
                  }
                }}
                className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs whitespace-nowrap"
              >
                Zerar Carteira
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mermaid Architecture Diagrams Section */}
      <MermaidDiagrams />
    </div>
  );
};
