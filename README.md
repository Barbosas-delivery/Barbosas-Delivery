# Barbosa's Delivery

Sistema de delivery, PDV, entregas, caixa, estoque, cupons, notificações, impressão e relatórios.

## Documentação

- [Manual de instalação e operação](./MANUAL-DO-SISTEMA.md)
- [Checklist de teste real de produção](./CHECKLIST-TESTE-PRODUCAO.md)
- [Histórico de fases](./docs/HISTORICO-DE-FASES.md)

## Comandos principais

```bash
npm ci
npm run lint
npm run test
npm run build
```

## Variáveis de ambiente obrigatórias para produção

Copie `.env.example` para `.env.local` no desenvolvimento e configure as mesmas variáveis no serviço de hospedagem:

```bash
VITE_SUPABASE_URL=https://SEU-PROJETO.supabase.co
VITE_SUPABASE_ANON_KEY=SUA_CHAVE_ANON_PUBLICA_DO_SUPABASE
```

Sem essas variáveis, o app não trava, mas a sincronização com Supabase fica desativada e o Diagnóstico mostra pendência.

## Diagnóstico

A Fase 30 adicionou a aba **Diagnóstico** para conferir ambiente, Supabase, PWA, impressão e dados carregados. Veja `docs/DIAGNOSTICO-SISTEMA.md`.


## Versão atual

`6.0.18-fase-50-revisao-final-producao`

## Revisão final

Pacote final revisado com lint, build e teste de fumaça automatizado.

- [Taxas por bairro](docs/TAXAS-POR-BAIRRO.md)


- [Relatórios comerciais avançados](docs/RELATORIOS-COMERCIAIS.md)


## Permissões por ação

Veja `docs/PERMISSOES-POR-ACAO.md` para os limites de desconto e ações permitidas por perfil.


- [Estoque no PDV](docs/ESTOQUE-PDV.md)


- [Motivos operacionais padronizados](docs/MOTIVOS-OPERACIONAIS.md)

- [Auditoria operacional](docs/AUDITORIA-OPERACIONAL.md)

- [Hoje operacional](docs/HOJE-OPERACIONAL.md)

- [Fechamento do dia](docs/FECHAMENTO-DO-DIA.md)
- [Fase 50 — Revisão final de produção](docs/FASE-50-REVISAO-FINAL-PRODUCAO.md)
