# Fase 56 — Instalador Windows

Versão: `6.0.44-fase-56-instalador-windows`

## Objetivo

Preparar o Barbosa’s Delivery Desktop para ser empacotado como aplicativo instalado no Windows, mantendo o Supabase como banco principal e o Electron como app local da loja para impressão automática.

## O que foi feito

- Adicionado script `desktop:installer` para gerar instalador NSIS do Windows.
- Adicionado script `desktop:pack` para gerar versão descompactada de teste.
- Mantido `desktop:build` apontando para o fluxo de instalador.
- Configurado `electron-builder` com nome do produto, appId, atalhos e saída em `release/`.
- Adicionada opção no painel desktop: iniciar junto com o Windows.
- A configuração local continua salva em `desktop-config.json` na pasta de dados do usuário.
- O painel desktop agora mostra a versão da Fase 56.

## Comandos

Instalar dependências:

```bash
pnpm install
```

Gerar build web:

```bash
pnpm run build
```

Abrir desktop em modo local:

```bash
pnpm run desktop
```

Gerar app descompactado para teste:

```bash
pnpm run desktop:pack
```

Gerar instalador Windows:

```bash
pnpm run desktop:installer
```

O instalador final será criado em:

```txt
release/Barbosas-Delivery-Desktop-6.0.44-Setup.exe
```

## Observação operacional

A Fase 56 não altera o schema do Supabase. A migração final `6.0.44` mantém a estrutura da fila de impressão da Fase 55 para facilitar a padronização do pacote.

## Checklist de teste

1. Rodar `pnpm run build`.
2. Rodar `pnpm run desktop`.
3. Abrir o painel Impressão.
4. Confirmar Supabase URL e chave.
5. Testar impressora.
6. Processar job pendente.
7. Confirmar no Supabase que `print_jobs.status` virou `printed`.
8. Rodar `pnpm run desktop:installer`.
9. Instalar o `.exe` gerado em `release/`.
10. Confirmar que o atalho abriu o desktop.
