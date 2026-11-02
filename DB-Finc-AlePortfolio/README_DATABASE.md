# AlePortfolio — Estrutura de Banco de Dados e Persistência

## 1. Visão Geral

O **AlePortfolio** adota uma arquitetura de persistência híbrida e resiliente:
1. **Google Sheets API** como fonte primária na nuvem (quando autenticado com conta Google Workspace / Drive / Sheets).
2. **Spreadsheet Local (`AlePortfolio_Database.xlsx`)** e **JSON de Estado (`aleportfolio_db.json`)** armazenados na pasta `/DB-Finc-AlePortfolio/` gerenciados pelo backend Express/Node.js.
3. **Fallback local em localStorage** no frontend para carregamento instantâneo offline e resiliência em caso de indisponibilidade de rede.

---

## 2. Dicionário de Dados das 13 Tabelas (Abas)

| Aba / Tabela | Chave Primária | Descrição |
|---|---|---|
| **1. BROKERS** | `broker_id` | Cadastro das corretoras ativas (NOMAD em USD, CLEAR em BRL). |
| **2. ASSETS** | `ticker` | Cadastro de ativos (Ações B3, FIIs, Mini Índice WIN, Mini Dólar WDO, Stocks e ETFs US). |
| **3. PORTFOLIO** | `holding_id` | Posição consolidada: quantidade, preço médio, cotação atual, valor de mercado e P&L não realizado. |
| **4. TRANSACTIONS** | `transaction_id` | Registro imutável de ordens de compra/venda, taxas, emolumentos B3 e IRRF retido na fonte. |
| **5. ALLOCATIONS** | `allocation_id` | Metas de alocação por corretora, classe de ativo e ativo individual com faixas de tolerância. |
| **6. EXCHANGE_RATES** | `rate_id` | Histórico e taxa cambial de referência USD/BRL com data de cotação para consolidação patrimonial. |
| **7. DIVIDENDS** | `dividend_id` | Proventos recebidos (Dividendos, Juros sobre Capital Próprio - JCP, Rendimentos de FIIs). |
| **8. TAX_MONTHLY** | `tax_closing_id` | Fechamento fiscal mensal por categoria (Swing Trade Ações, Day Trade, FIIs, Futuros). |
| **9. TAX_LOSSES** | `loss_id` | Histórico segregado de prejuízos compensáveis acumulados para abater lucros futuros. |
| **10. DARF** | `darf_id` | Guias de recolhimento tributário (Código 6015), vencimentos no último dia útil do mês subsequente e status. |
| **11. CASH_BALANCES** | `balance_id` | Saldo disponível e reservado por corretora (USD na Nomad e BRL na Clear). |
| **12. SETTINGS** | `key` | Configurações do usuário, parâmetros de rebalanceamento e preferências de alerta. |
| **13. AUDIT_LOG** | `log_id` | Trilha de auditoria cronológica com data, tipo de evento e integridade de reconciliação. |

---

## 3. Regras de Integridade e Legislação Fiscal Brasileira

- **Segregação de Prejuízos:** Prejuízos de Day Trade não compensam Swing Trade de Ações; Prejuízos de FIIs só abatem ganhos de FIIs.
- **Isenção de R$ 20.000:** Aplicável unicamente a Swing Trade de Ações no mercado à vista brasileiro.
- **DARF Mínimo:** Valores apurados inferiores a R$ 10,00 acumulam para o mês subsequente até atingir o piso legal.
- **Conversão Cambial:** Ativos Nomad (USD) são estritamente convertidos pela PTAX/taxa cambial registrada antes de consolidação.
