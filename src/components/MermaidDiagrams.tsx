/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Network, Database, ArrowRightLeft, Receipt, Sliders, Copy, Check } from 'lucide-react';

export const MermaidDiagrams: React.FC = () => {
  const [selectedDiagram, setSelectedDiagram] = useState<
    'ARCHITECTURE' | 'DATABASE' | 'IMPORT' | 'DARF' | 'REBALANCE'
  >('ARCHITECTURE');
  const [copied, setCopied] = useState(false);

  const diagrams = {
    ARCHITECTURE: {
      title: '1. Arquitetura do Sistema (System Architecture)',
      description: 'Estrutura completa em camadas: Frontend React/Tailwind, Backend Express/Node.js, Persistência Local e Nuvem Google Sheets API.',
      code: `graph TD
    subgraph Client["Camada Cliente (Frontend - Vite + React 19)"]
        UI[Interface Fintech Desktop-First]
        State[React State & Hooks]
        Charts[Gráficos & Métricas de Alocação]
        AuthModal[Google Sign-In / OAuth]
    end

    subgraph Backend["Camada de Serviços (Express REST API)"]
        API[Servidor Express /api/portfolio]
        CalcEngine[Motor de Preço Médio & PnL]
        TaxEngine[Motor Fiscal RFB & DARF 6015]
        RebalanceEngine[Simulador de Alocação & Aportes]
        ExcelGen[Gerador XLSX 13 Abas]
    end

    subgraph Storage["Camada de Persistência Híbrida"]
        LocalJSON[("aleportfolio_db.json")]
        LocalXLSX[("AlePortfolio_Database.xlsx")]
        GoogleSheets[("Google Sheets API (Cloud Drive)")]
    end

    subgraph Brokers["Instituições Conectadas"]
        Nomad[Nomad Global (USD)]
        Clear[Clear Corretora B3 (BRL)]
    end

    UI -->|Requisições REST| API
    AuthModal -->|OAuth Bearer Token| GoogleSheets
    API --> CalcEngine
    API --> TaxEngine
    API --> RebalanceEngine
    API --> ExcelGen
    ExcelGen --> LocalXLSX
    API --> LocalJSON
    UI -.->|Sincronização Direta| GoogleSheets
    Nomad -.->|Extratos & Ordens| API
    Clear -.->|Notas Corretagem B3| API`
    },
    DATABASE: {
      title: '2. Estrutura do Banco de Dados (Database Schema)',
      description: 'Modelo relacional das 13 tabelas estruturadas tanto no JSON local quanto nas 13 abas do Google Sheets e Excel.',
      code: `erDiagram
    BROKERS ||--o{ ASSETS : "registra"
    BROKERS ||--o{ CASH_BALANCES : "possui"
    BROKERS ||--o{ TRANSACTIONS : "executa"
    BROKERS ||--o{ DIVIDENDS : "credita"
    BROKERS ||--o{ TAX_MONTHLY : "apura"

    ASSETS ||--o{ PORTFOLIO : "consolida"
    ASSETS ||--o{ TRANSACTIONS : "opera"
    ASSETS ||--o{ DIVIDENDS : "gera"

    TRANSACTIONS }o--|| TAX_MONTHLY : "alimenta calculo"
    TAX_MONTHLY ||--o| DARF : "origina guia 6015"
    TAX_MONTHLY ||--o{ TAX_LOSSES : "acumula/compensa"

    ALLOCATIONS ||--o{ PORTFOLIO : "compara meta vs atual"
    EXCHANGE_RATES ||--o{ PORTFOLIO : "converte USD para BRL"
    SETTINGS ||--o{ ALLOCATIONS : "define limites tolerância"
    AUDIT_LOG }o--|| TRANSACTIONS : "registra histórico"`
    },
    IMPORT: {
      title: '3. Fluxo de Importação de Transações (Transaction Import Flow)',
      description: 'Processo de ingestão de Notas de Corretagem Clear (B3) e extratos Nomad (USD), validação de campos e prevenção de duplicidade.',
      code: `flowchart TD
    Start([Upload de Arquivo]) --> FileCheck{Tipo de Arquivo?}
    FileCheck -->|PDF / Nota B3| TextParser[Parser de Nota de Corretagem]
    FileCheck -->|CSV / Excel| SheetParser[Parser SheetJS XLSX]
    FileCheck -->|JSON| JSONParser[Validador JSON Schema]

    TextParser --> Normalize[Normalizar Campos: Data, Ticker, Qtd, Preço, Taxas]
    SheetParser --> Normalize
    JSONParser --> Normalize

    Normalize --> HashGen[Gerar Hash Único de Reconciliação]
    HashGen --> DupCheck{Hash Já Existe no Banco?}
    DupCheck -->|Sim| Discard[Ignorar Transação Duplicada]
    DupCheck -->|Não| RecalcHolding[Recalcular Custo Médio Ponderado]

    RecalcHolding --> RecalcTax[Recalcular Apuração Fiscal do Mês]
    RecalcTax --> AuditLog[Registrar em AUDIT_LOG]
    AuditLog --> Persist[Gravar JSON & Regenerar Planilha XLSX]
    Persist --> End([Carteira Atualizada com Sucesso])`
    },
    DARF: {
      title: '4. Fluxo de Cálculo de DARF (Brazilian Tax Engine Workflow)',
      description: 'Lógica fiscal estrita baseada nas normas da Receita Federal (IN RFB 1.585/2015) para operações na bolsa.',
      code: `flowchart TD
    MonthStart([Início da Apuração Mensal]) --> FilterClear[Filtrar Vendas Clear do Mês]
    FilterClear --> Segregate[Segregar por Modalidade: Swing, Day Trade, FIIs, Futuros]

    subgraph SwingTrade["Ações — Swing Trade"]
        Check20k{Vendas Totais <= R$ 20.000?}
        Check20k -->|Sim| Exempt[Isenção Legal Art. 59 - Imposto Zero]
        Check20k -->|Não| CompSwing[Compensar Prejuízos Anteriores de Ações]
        CompSwing --> Tax15[Aplicar Alíquota de 15%]
    end

    subgraph DayTrade["Day Trade (Qualquer Ativo)"]
        NoExemptDT[Sem Isenção] --> CompDT[Compensar Apenas Prejuízos de Day Trade]
        CompDT --> Tax20DT[Aplicar Alíquota de 20%]
    end

    subgraph FIIs["Fundos Imobiliários (FIIs)"]
        NoExemptFII[Sem Isenção] --> CompFII[Compensar Apenas Prejuízos de FIIs]
        CompFII --> Tax20FII[Aplicar Alíquota de 20%]
    end

    Tax15 --> SumTax[Somar Impostos Brutos Apurados]
    Tax20DT --> SumTax
    Tax20FII --> SumTax
    Exempt --> SumTax

    SumTax --> DeductIRRF[Deduzir IRRF Retido na Fonte]
    DeductIRRF --> AddPrior[Somar Imposto Retido Anterior < R$ 10]
    AddPrior --> CheckMin{Total a Recolher >= R$ 10,00?}

    CheckMin -->|Não| Carryover[Acumular para Mês Subsequente - Sem DARF]
    CheckMin -->|Sim| IssueDARF[Gerar Guia DARF Código 6015]
    IssueDARF --> SetDeadline[Definir Vencimento: Último Dia Útil Mês Seguinte]
    SetDeadline --> Alert[Disparar Alerta no Dashboard e Notificação]`
    },
    REBALANCE: {
      title: '5. Fluxo de Rebalanceamento (Portfolio Rebalancing Workflow)',
      description: 'Rebalanceamento inteligente orientado a novos aportes, sem acionar vendas forçadas ou gerar impostos desnecessários.',
      code: `flowchart TD
    InputContribution([Informar Novo Aporte R$ ou Caixa Livre]) --> FetchHoldings[Obter Posições Atuais em BRL]
    FetchHoldings --> CalcCurrentPct[Calcular % Atual de Cada Ativo/Classe]
    CalcCurrentPct --> CompareTarget[Comparar com % Alvo Desejado]

    CompareTarget --> CalcDeviations[Calcular Desvio em Pontos Percentuais: pp]
    CalcDeviations --> CheckTolerance{Desvio Excede Tolerância?}
    CheckTolerance -->|Desvio < -2 pp| Underweight[Ativo Abaixo da Meta: UNDERWEIGHT]
    CheckTolerance -->|Desvio > +2 pp| Overweight[Ativo Acima da Meta: OVERWEIGHT]
    CheckTolerance -->|Dentro Tolerância| OnTarget[No Alvo: ON TARGET]

    Underweight --> AllocEngine[Motor Proporcional de Aporte]
    InputContribution --> AllocEngine
    AllocEngine --> ProportionalDist[Distribuir Aporte Proporcional ao Gap]
    ProportionalDist --> CheckComplete{Aporte Suficiente para Equilibrar?}
    CheckComplete -->|Sim| Balanced[Todas as Metas Atingidas sem Vender Nada]
    CheckComplete -->|Não| RemainingGaps[Alcançar Equilíbrio Máximo com o Capital Disponível]
    Overweight --> SuggestPause[Recomendação: Pausar Novos Aportes neste Ativo]`
    }
  };

  const current = diagrams[selectedDiagram];

  const handleCopy = () => {
    navigator.clipboard.writeText(current.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
        <div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Network className="w-5 h-5 text-emerald-600" />
            Diagramas Mermaid de Arquitetura & Engenharia de Dados
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Documentação arquitetural completa do AlePortfolio conforme especificação técnica
          </p>
        </div>

        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 transition-all self-start md:self-auto"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
          <span>{copied ? 'Copiado!' : 'Copiar Código Mermaid'}</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 overflow-x-auto pb-1 text-xs font-semibold">
        {[
          { id: 'ARCHITECTURE', label: '1. Arquitetura do Sistema', icon: Network },
          { id: 'DATABASE', label: '2. Modelo de Dados (13 Abas)', icon: Database },
          { id: 'IMPORT', label: '3. Ingestão de Transações', icon: ArrowRightLeft },
          { id: 'DARF', label: '4. Motor Fiscal & DARF', icon: Receipt },
          { id: 'REBALANCE', label: '5. Motor de Rebalanceamento', icon: Sliders }
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = selectedDiagram === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setSelectedDiagram(tab.id as any)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-emerald-600 text-white font-bold shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Current Diagram Card */}
      <div className="space-y-3">
        <div>
          <h4 className="font-bold text-sm text-slate-900 dark:text-white">
            {current.title}
          </h4>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {current.description}
          </p>
        </div>

        {/* Code Box */}
        <pre className="p-4 rounded-xl bg-slate-950 text-emerald-400 font-mono text-xs overflow-x-auto border border-slate-800 leading-relaxed max-h-96">
          <code>{current.code}</code>
        </pre>
      </div>
    </div>
  );
};
