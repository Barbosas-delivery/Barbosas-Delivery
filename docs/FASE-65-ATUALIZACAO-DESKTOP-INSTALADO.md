# Fase 65 — Atualização do aplicativo Desktop instalado no PC

Versão: `6.0.53-fase-65-atualizacao-desktop-instalado`

## Objetivo

Garantir que o aplicativo instalado no computador da loja seja atualizado de forma controlada, sem depender apenas do deploy web/Vercel.

## O que mudou

- Desktop/Electron atualizado para `6.0.53`.
- Painel local ganhou a seção **Atualização do app instalado no PC**.
- O painel mostra versão instalada, PC, caminho da configuração local e checklist de prontidão.
- Criado backup da configuração local `desktop-config.json` pelo próprio painel.
- Criado registro da instalação no Supabase por computador/worker.
- Criado SQL `supabase/migracao-final-producao-6-0-53.sql`.
- Criados scripts auxiliares para gerar instalador Windows.

## Como atualizar o PC da loja

1. Rodar o SQL `supabase/migracao-final-producao-6-0-53.sql`.
2. No projeto, rodar `pnpm install` se as dependências ainda não estiverem instaladas.
3. Gerar o instalador com `pnpm run desktop:installer`.
4. Abrir a pasta `release`.
5. Instalar o arquivo `Barbosas-Delivery-Desktop-6.0.53-Setup.exe`.
6. Abrir o Desktop instalado.
7. Conferir no painel se aparece `6.0.53-fase-65-atualizacao-desktop-instalado`.
8. Testar Supabase e impressora.
9. Clicar em **Registrar instalação no Supabase**.

## Observação importante

O deploy web atualiza o sistema no navegador. O aplicativo instalado no PC precisa ser reinstalado/atualizado com o novo instalador para receber mudanças do Electron, impressão local e painel desktop.
