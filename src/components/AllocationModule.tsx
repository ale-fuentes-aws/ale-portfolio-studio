/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  PieChart,
  Sliders,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  ArrowDownRight,
  ArrowUpRight,
  Coins,
  ShieldCheck,
  Save,
  HelpCircle,
  Sparkles
} from 'lucide-react';
import { formatBRL, formatPercent } from '../utils/formatters';
import {
  simulateRebalancingWithContribution
} from '../utils/portfolioCalculations';
import {
  DatabaseState,
  PortfolioSummary,
  AllocationComparison,
  AllocationTarget
} from '../types/portfolio';

interface AllocationModuleProps {
  summary: PortfolioSummary;
  dbState: DatabaseState;
  allocationComparisons: AllocationComparison[];
  onSaveTargets: (newTargets: AllocationTarget[]) => void;
}

export const AllocationModule: React.FC<AllocationModuleProps> = ({
  summary,
  dbState,
  allocationComparisons,
  onSaveTargets
}) => {
  const [selectedLevel, setSelectedLevel] = useState<'ALL' | 'BROKER' | 'ASSET_CLASS' | 'CASH'>('ALL');
  const [contributionInput, setContributionInput] = useState('5000');
  const [useAvailableCash, setUseAvailableCash] = useState(false);
  const [isEditingTargets, setIsEditingTargets] = useState(false);
  const [editableTargets, setEditableTargets] = useState<AllocationTarget[]>(dbState.allocations);

  const totalCashBrl = summary.total_cash_brl_equivalent;
  const effectiveContribution = useAvailableCash
    ? totalCashBrl
    : parseFloat(contributionInput) || 0;

  // Run rebalance simulation
  const simulation = simulateRebalancingWithContribution(
    effectiveContribution,
    allocationComparisons
  );

  const filteredComparisons = allocationComparisons.filter((c) => {
    if (selectedLevel === 'ALL') return true;
    return c.level === selectedLevel;
  });

  const handleTargetChange = (index: number, newPct: number) => {
    const updated = [...editableTargets];
    updated[index] = { ...updated[index], target_percentage: Math.max(0, newPct) };
    setEditableTargets(updated);
  };

  const handleSave = () => {
    onSaveTargets(editableTargets);
    setIsEditingTargets(false);
  };

  // Grouped counts
  const underweightCount = allocationComparisons.filter((c) => c.suggested_action === 'INVEST').length;
  const overweightCount = allocationComparisons.filter((c) => c.suggested_action === 'REDUCE').length;
  const onTargetCount = allocationComparisons.filter((c) => c.suggested_action === 'ON_TARGET').length;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl p-6 shadow-xl border border-indigo-900/60">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="p-1.5 rounded-lg bg-indigo-600 text-white">
                <PieChart className="w-4 h-4" />
              </span>
              <span className="text-xs font-bold tracking-wider uppercase text-indigo-300">
                Gestão de Alocação & Metas de Patrimônio
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Metas Desejadas vs. Posição Atual
            </h1>
            <p className="text-xs sm:text-sm text-indigo-200 mt-1 max-w-2xl leading-relaxed">
              Monitore desvios percentuais em relação à sua carteira ideal. O motor de rebalanceamento prioriza novos aportes e caixa livre para recompor metas sem provocar vendas desnecessárias ou incidência tributária.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {isEditingTargets ? (
              <button
                onClick={handleSave}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md transition-all"
              >
                <Save className="w-4 h-4" />
                Salvar Novas Metas
              </button>
            ) : (
              <button
                onClick={() => {
                  setEditableTargets(dbState.allocations);
                  setIsEditingTargets(true);
                }}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md transition-all"
              >
                <Sliders className="w-4 h-4" />
                Ajustar % Alvos
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Allocation Status Overview Badges */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
              Abaixo da Meta (Underweight)
            </span>
            <div className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-0.5">
              {underweightCount} categorias
            </div>
            <span className="text-xs text-slate-400">Requerem novos aportes prioritários</span>
          </div>
          <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600">
            <ArrowUpRight className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
              Na Faixa Ideal (On Target)
            </span>
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
              {onTargetCount} categorias
            </div>
            <span className="text-xs text-slate-400">Dentro da tolerância estipulada</span>
          </div>
          <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
              Acima da Meta (Overweight)
            </span>
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-0.5">
              {overweightCount} categorias
            </div>
            <span className="text-xs text-slate-400">Pausar novos aportes nesta classe</span>
          </div>
          <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600">
            <ArrowDownRight className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Rebalancing Recommendation Simulator */}
      <div className="bg-gradient-to-br from-emerald-950/20 via-slate-900 to-indigo-950/20 rounded-2xl p-6 border border-emerald-500/30 shadow-md">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold uppercase tracking-wider mb-1">
              <Sparkles className="w-4 h-4" />
              Simulador de Aporte & Rebalanceamento Sem Vendas
            </div>
            <h3 className="text-xl font-extrabold text-white">
              Para Onde Direcionar o Próximo Aporte?
            </h3>
            <p className="text-xs text-slate-300 mt-1 max-w-xl">
              Informe o valor em Reais que deseja investir ou utilize o caixa disponível. O sistema calcula a distribuição matemática proporcional para fechar os gaps de alocação.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="flex items-center gap-2 bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-700">
              <input
                type="checkbox"
                id="useCash"
                checked={useAvailableCash}
                onChange={(e) => setUseAvailableCash(e.target.checked)}
                className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 bg-slate-700 border-slate-600"
              />
              <label htmlFor="useCash" className="text-xs text-slate-300 cursor-pointer font-medium">
                Usar Caixa Livre ({formatBRL(totalCashBrl)})
              </label>
            </div>

            {!useAvailableCash && (
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-xs text-slate-400 font-bold">R$</span>
                <input
                  type="number"
                  min="0"
                  step="100"
                  value={contributionInput}
                  onChange={(e) => setContributionInput(e.target.value)}
                  placeholder="5000"
                  className="pl-9 pr-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white font-mono text-sm w-44 focus:outline-none focus:border-emerald-500"
                />
              </div>
            )}
          </div>
        </div>

        {/* Simulator Results */}
        <div className="pt-6">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-3">
            <span>Recomendação de Destinação do Aporte ({formatBRL(effectiveContribution)})</span>
            <span>Total Alocado: <strong className="text-emerald-400 font-mono">{formatBRL(simulation.totalAllocated)}</strong> · Saldo Remanescente: <strong className="text-white font-mono">{formatBRL(simulation.remainingCash)}</strong></span>
          </div>

          {simulation.recommendations.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {simulation.recommendations.map((rec) => (
                <div
                  key={rec.identifier}
                  className="bg-slate-900/90 border border-emerald-500/30 p-4 rounded-xl flex flex-col justify-between"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-sm text-white">{rec.label}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 font-semibold border border-emerald-800">
                      APORTAR
                    </span>
                  </div>
                  <div className="text-xl font-bold font-mono text-emerald-400 my-1">
                    {formatBRL(rec.allocatedContributionBrl)}
                  </div>
                  <div className="text-xs text-slate-400 flex items-center justify-between mt-2 pt-2 border-t border-slate-800">
                    <span>Meta Desejada: {rec.targetPct.toFixed(1)}%</span>
                    <span>Projeção pós-aporte: ~{rec.projectedPct.toFixed(1)}%</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-xl text-center text-xs text-slate-400">
              Todos os ativos estão equilibrados na faixa ideal ou não há valor de aporte informado.
            </div>
          )}

          <div className="flex items-start gap-2 mt-4 text-[11px] text-slate-400 bg-slate-900/40 p-3 rounded-xl border border-slate-800">
            <ShieldCheck className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
            <span>
              <strong>Aviso Importante:</strong> Esta recomendação é puramente matemática e informativa. O sistema nunca executa ordens automaticamente. Ao realizar compras no mercado, considere sempre lotes mínimos e custos operacionais.
            </span>
          </div>
        </div>
      </div>

      {/* Allocation Comparison Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-bold text-base text-slate-900 dark:text-white">
              Tabela de Desvios: Atual vs. Meta
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Desvio em pontos percentuais (pp) e volume financeiro em BRL para reequilíbrio
            </p>
          </div>

          {/* Level Filter Tabs */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-semibold">
            {(['ALL', 'BROKER', 'ASSET_CLASS', 'CASH'] as const).map((level) => (
              <button
                key={level}
                onClick={() => setSelectedLevel(level)}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  selectedLevel === level
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {level === 'ALL' && 'Todos'}
                {level === 'BROKER' && 'Por Corretora'}
                {level === 'ASSET_CLASS' && 'Classes'}
                {level === 'CASH' && 'Caixa'}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="py-3 px-4">Categoria / Ativo</th>
                <th className="py-3 px-4">Nível</th>
                <th className="py-3 px-4 text-right">Alocação Atual</th>
                <th className="py-3 px-4 text-right">Meta Desejada</th>
                <th className="py-3 px-4 text-right">Diferença (pp)</th>
                <th className="py-3 px-4 text-right">Valor Atual (BRL)</th>
                <th className="py-3 px-4 text-right">Valor Alvo (BRL)</th>
                <th className="py-3 px-4 text-right">Ajuste Sugerido</th>
                <th className="py-3 px-4 text-center">Status / Alerta</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredComparisons.map((item, index) => {
                const isUnder = item.difference_pp < -0.2;
                const isOver = item.difference_pp > 0.2;

                return (
                  <tr key={`${item.level}_${item.target_identifier}`} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                    <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">
                      {item.label}
                    </td>
                    <td className="py-3.5 px-4 text-xs text-slate-500">
                      {item.level === 'BROKER' && 'Corretora'}
                      {item.level === 'ASSET_CLASS' && 'Classe de Ativo'}
                      {item.level === 'CASH' && 'Reserva'}
                      {item.level === 'INDIVIDUAL_ASSET' && 'Ativo Específico'}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-semibold text-slate-900 dark:text-white">
                      {item.current_pct.toFixed(2)}%
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono">
                      {isEditingTargets ? (
                        <input
                          type="number"
                          step="0.5"
                          min="0"
                          max="100"
                          value={editableTargets[index]?.target_percentage || 0}
                          onChange={(e) => handleTargetChange(index, parseFloat(e.target.value) || 0)}
                          className="w-16 px-1.5 py-1 text-right font-mono text-xs rounded border border-indigo-400 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                        />
                      ) : (
                        <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                          {item.target_pct.toFixed(1)}%
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-bold">
                      <span className={isUnder ? 'text-amber-600' : isOver ? 'text-blue-600' : 'text-emerald-600'}>
                        {item.difference_pp > 0 ? `+${item.difference_pp.toFixed(2)}` : item.difference_pp.toFixed(2)} pp
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono text-slate-600 dark:text-slate-400">
                      {formatBRL(item.current_value_brl)}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono text-slate-900 dark:text-white font-medium">
                      {formatBRL(item.target_value_brl)}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-bold">
                      {item.suggested_action === 'INVEST' && (
                        <span className="text-amber-600 dark:text-amber-400">
                          Aportar {formatBRL(item.suggested_amount_brl)}
                        </span>
                      )}
                      {item.suggested_action === 'REDUCE' && (
                        <span className="text-blue-600 dark:text-blue-400">
                          Excedente {formatBRL(item.suggested_amount_brl)}
                        </span>
                      )}
                      {item.suggested_action === 'ON_TARGET' && (
                        <span className="text-emerald-600 dark:text-emerald-400">
                          Equilibrado
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      {item.alert_level === 'CRITICAL' && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800">
                          <AlertTriangle className="w-3 h-3" /> Crítico
                        </span>
                      )}
                      {item.alert_level === 'WARNING' && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                          <AlertTriangle className="w-3 h-3" /> Atenção
                        </span>
                      )}
                      {item.alert_level === 'ON_TARGET' && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                          <CheckCircle2 className="w-3 h-3" /> No Alvo
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
