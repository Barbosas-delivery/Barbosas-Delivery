# Fase 54 — Aplicativo Electron básico

Versão: `6.0.41-fase-54-electron-basico`

## Objetivo

Criar a primeira base do aplicativo instalado no computador da loja, mantendo o Supabase como banco principal e deixando o Electron responsável por recursos locais que o navegador comum não executa bem.

## Entregue nesta fase

- Estrutura Electron em `electron/`.
- Janela principal carregando o app web após `npm run build`.
- Painel local de impressão em `electron/print-panel.html`.
- Configuração local salva no computador em `desktop-config.json` dentro da pasta de dados do app.
- Listagem de impressoras locais pelo Electron.
- Teste de impressão local usando `webContents.print`.
- Validação básica da conexão Supabase e da tabela `print_jobs`.
- Scripts npm para abrir desktop e gerar instalador futuramente.
- Teste de fumaça específico para a estrutura Electron.

## O que fica salvo no computador

Apenas dados técnicos da máquina:

- URL do Supabase configurada para o desktop.
- Chave anon do Supabase configurada para o desktop.
- Impressora escolhida.
- Largura do papel: 58mm ou 80mm.
- Preferência de impressão silenciosa.
- Regras locais de autoimpressão.

Produtos, pedidos, estoque, caixa, clientes e comandas continuam no Supabase.

## Regras operacionais preparadas

- Pedido do app: 1 via cozinha + 1 via entrega.
- PDV Entregas: 1 via cozinha + 1 via entrega.
- PDV Balcão: 1 via balcão.

## Como testar localmente

```bash
npm install
npm run build
npm run desktop
```

Para desenvolvimento com Vite:

```bash
npm run dev
```

Em outro terminal:

```bash
BARBOSAS_DESKTOP_DEV_URL=http://localhost:5173 npm run desktop
```

No Windows PowerShell:

```powershell
$env:BARBOSAS_DESKTOP_DEV_URL="http://localhost:5173"; npm run desktop
```

## Próxima fase

A Fase 55 deve ativar o consumidor automático da fila `print_jobs`:

1. Reservar jobs pendentes com `claim_pending_print_jobs`.
2. Imprimir o HTML do cupom na impressora configurada.
3. Marcar como `printed` ou `failed`.
4. Registrar tentativas, erro e impressora usada.
