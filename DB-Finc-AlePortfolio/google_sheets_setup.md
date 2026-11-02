# Como Configurar e Sincronizar com o Google Sheets

## Visão Geral
O **AlePortfolio** permite salvar e sincronizar sua carteira de investimentos diretamente com uma planilha no Google Sheets na sua conta Google Drive, além de manter a cópia local em arquivo Excel (.xlsx) e JSON no backend.

---

## 1. Conexão Automática via Google Sign-In
1. No menu superior ou na aba **Configurações & Dados**, clique no botão **"Entrar com Google"** (Sign in with Google).
2. O Google solicitará permissão para criar e gerenciar arquivos de planilhas (`spreadsheets` e `drive.file`) criados pelo aplicativo.
3. Ao confirmar, o AlePortfolio identifica se já existe uma planilha chamada **`AlePortfolio_Database`** no seu Google Drive. Se não existir, ele cria automaticamente todas as 13 abas estruturadas com formatação de cabeçalho, colunas e validações.

---

## 2. Abas Criadas Automaticamente na Planilha:
1. `BROKERS`
2. `ASSETS`
3. `PORTFOLIO`
4. `TRANSACTIONS`
5. `ALLOCATIONS`
6. `EXCHANGE_RATES`
7. `DIVIDENDS`
8. `TAX_MONTHLY`
9. `TAX_LOSSES`
10. `DARF`
11. `CASH_BALANCES`
12. `SETTINGS`
13. `AUDIT_LOG`

---

## 3. Modo Local e Fallback
Se você optar por não conectar o Google Sheets ou estiver offline:
- O AlePortfolio funciona **100% de forma autônoma** utilizando o arquivo local `DB-Finc-AlePortfolio/AlePortfolio_Database.xlsx` e `aleportfolio_db.json`.
- A qualquer momento você pode clicar em **"Exportar Excel (.xlsx)"** para baixar a planilha consolidada completa com fórmulas e formatação para seu computador.
