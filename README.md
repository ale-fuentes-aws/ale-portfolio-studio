# AlePortfolio — Personal Investment Management Platform

**AlePortfolio** é uma plataforma fintech para consolidação e gestão de carteiras de investimentos multimoeda, com suporte inicial nativo para **CLEAR Corretora (BRL)** e **NOMAD Global (USD)**, cálculo de alocação de ativos com rebalanceamento sem vendas forçadas, apuração tributária brasileira (Receita Federal do Brasil) com controle de DARF (Código 6015) e persistência híbrida via **Google Sheets API** e planilha local **Excel (.xlsx)**.

---

## 1. Principais Módulos & Recursos

### 1.1 Dashboard Consolidado (NOMAD + CLEAR)
- **Patrimônio Líquido Total em BRL** com conversão estrita cambial (nunca soma USD e BRL sem converter).
- **Indicadores Financeiros Chave:** Capital Investido, P&L Não Realizado (R$ e %), P&L Realizado, Caixa Total Equivalente.
- **Cartões Comparativos:**
  - **NOMAD:** Saldo em Dólares (USD), valor de mercado, caixa livre em USD, retorno % e equivalente em Reais.
  - **CLEAR:** Saldo em Reais (BRL), custódia em B3, caixa livre, P&L e status DARF do mês.
- **Distribuição de Ativos:** Gráficos e barras empilhadas por corretora e por classe de ativo (Ações B3, FIIs, ETFs Internacionais, Stocks US, Futuros, Caixa).
- **Controle de Câmbio USD/BRL:** Exibição da cotação PTAX, data de referência e histórico.

### 1.2 Módulo NOMAD (Internacional — USD)
- Gestão de Stocks (ex: AAPL, MSFT) e ETFs Internacionais (ex: VOO, QQQ).
- Custo médio de aquisição em USD, cotação atual e valor de mercado em USD e convertido em BRL.
- Histórico de proventos com retenção de 30% na fonte (US Withholding Tax para não residentes).
- Gestão de saldo em conta corrente em Dólares.

### 1.3 Módulo CLEAR (Nacional — BRL)
- Gestão de Ações B3 (PETR4, VALE3, WEGE3, ITUB4), Fundos Imobiliários (MXRF11, HGLG11, XPML11) e Contratos Futuros (WIN / WDO).
- Custo Médio Ponderado, cotações atualizadas, taxas e emolumentos B3, IRRF dedo-duro.
- Monitoramento individual de obrigações fiscais e emissão de DARF.
- Importação de Notas de Corretagem B3 em PDF, CSV, Excel e JSON com reconciliação anti-duplicidade.

### 1.4 Gestão de Alocação & Rebalanceamento Inteligente
- Metas configuráveis por corretora, classe de ativo, ativo individual e caixa.
- Tabela comparativa com desvios em pontos percentuais (pp), valor atual vs alvo e ação recomendada (APORTAR / REDUZIR / NO ALVO).
- Níveis de tolerância configuráveis (Aviso: desvio > 2 pp; Crítico: desvio > 5 pp).
- **Simulador de Aportes Sem Vendas:** O algoritmo prioriza novos aportes financeiros e caixa livre para recompor as classes deficitárias proporcionalmente, sem acionar vendas de ativos nem gerar custos operacionais ou impostos desnecessários.

### 1.5 Módulo Tributário Brasileiro & DARF (Receita Federal)
- Implementação rigorosa da **Instrução Normativa RFB nº 1.585/2015**, **Lei 11.033/2004** e **Lei 14.754/2023**:
  1. **Ações (Swing Trade):** Isenção legal para alienação total no mês até R$ 20.000,00. Vendas superiores são tributadas em 15% sobre o ganho líquido.
  2. **Day Trade:** Tributado em 20% sobre o ganho líquido (sem faixa de isenção) com dedução de 1% de IRRF retido na fonte. Prejuízos de Day Trade compensam estritamente ganhos futuros de Day Trade.
  3. **FIIs / Fiagros:** Tributado em 20% sobre o ganho de capital na alienação de cotas (sem faixa de isenção). Prejuízos compensam exclusivamente ganhos futuros de FIIs.
  4. **Mercado Futuro (WIN/WDO):** 15% Swing Trade ou 20% Day Trade.
  5. **Regra do DARF Mínimo:** Imposto apurado inferior a R$ 10,00 não é recolhido no mês e acumula para o próximo período fiscal.
  6. **Vencimento Legal:** Último dia útil do mês subsequente às operações (Código de Receita 6015).
  7. **Trilha de Auditoria:** Memória de cálculo detalhada passo a passo com referências legais.
  8. **Quitação de DARF:** Registro de data de pagamento, valor liquidado e comprovante.

### 1.6 Persistência Híbrida & Google Sheets
- **Google Sheets API:** Sincronização direta via OAuth (Firebase Auth Google Sign-In) com criação automática da planilha `AlePortfolio_Database` no Google Drive contendo todas as 13 abas.
- **Banco Local:** Pasta `/DB-Finc-AlePortfolio/` contendo:
  - `AlePortfolio_Database.xlsx` (planilha Excel com 13 abas)
  - `aleportfolio_db.json` (banco de dados persistente em JSON)
  - `database_schema.json` (dicionário de dados formal JSON Schema)
  - `README_DATABASE.md` (documentação de integridade)
  - `google_sheets_setup.md` (instruções de sincronização)
- **Exportação:** Download da planilha consolidada com 13 abas em formato `.xlsx` com um clique.

---

## 2. As 13 Abas / Tabelas do Banco de Dados

1. `BROKERS` — Instituições e moedas base (CLEAR em BRL, NOMAD em USD).
2. `ASSETS` — Cadastro de instrumentos financeiros, tickers e cotações.
3. `PORTFOLIO` — Posição consolidada com preço médio ponderado e P&L não realizado.
4. `TRANSACTIONS` — Livro imutável de ordens com hash de reconciliação anti-duplicidade.
5. `ALLOCATIONS` — Metas percentuais e faixas de tolerância.
6. `EXCHANGE_RATES` — Histórico cambial USD/BRL e cotação PTAX vigente.
7. `DIVIDENDS` — Proventos recebidos (dividendos, JCP, rendimentos de FIIs e retenção US).
8. `TAX_MONTHLY` — Fechamentos tributários mensais segregados por categoria.
9. `TAX_LOSSES` — Livro de controle de prejuízos compensáveis acumulados.
10. `DARF` — Guias de recolhimento Código 6015, vencimentos e histórico de pagamento.
11. `CASH_BALANCES` — Saldos disponíveis e reservados por corretora.
12. `SETTINGS` — Configurações de sistema e preferências do usuário.
13. `AUDIT_LOG` — Trilha de auditoria cronológica imutável.

---

## 3. Instruções de Instalação e Execução

### Pré-requisitos
- Node.js 20+
- npm ou bun

### Instalação de Dependências
\`\`\`bash
npm install
\`\`\`

### Execução em Modo de Desenvolvimento (Frontend + Backend)
\`\`\`bash
npm run dev
\`\`\`
O servidor Express inicializa em `http://localhost:3000` com os endpoints REST da API e monta os middlewares do Vite para o frontend React com hot reload.

### Build de Produção
\`\`\`bash
npm run build
\`\`\`

---

## 4. Diagramas Mermaid de Arquitetura

Consulte a aba **Configurações & Arquitetura** na aplicação para visualizar e copiar os 5 diagramas interativos:
1. Arquitetura do Sistema (System Architecture)
2. Estrutura do Banco de Dados (Database ER Diagram)
3. Fluxo de Importação de Notas de Corretagem
4. Fluxo de Apuração de DARF e Compensação de Prejuízos
5. Algoritmo de Rebalanceamento com Novos Aportes

---

## 5. Licença & Conformidade
- Licença: Apache-2.0
- Base legal: Instrução Normativa RFB nº 1.585/2015 da Receita Federal do Brasil.
