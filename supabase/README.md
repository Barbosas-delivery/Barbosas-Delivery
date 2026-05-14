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

`6.0.30-fase-50-app-dividido-auditoria-final`

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
- [Auditoria final kit Supabase](docs/AUDITORIA-FINAL-KIT-SUPABASE.md)


## Fase 50 — Auditoria final criteriosa

Versão: `6.0.23-fase-50-auditoria-final-criteriosa`

Correção adicional: produtos com `active` nulo/ausente no Supabase agora são tratados como ativos para evitar que produtos antigos sumam do catálogo do cliente após atualização, mantendo ocultação por `active=false` ou `deleted_at`.


## Revisão 6.0.24 — auditoria final kit Supabase

- Edição de kits agora salva dados principais e itens no Supabase.
- A tela recarrega os kits do Supabase após salvar.
- Teste de fumaça ampliado para impedir edição de kit apenas local.

## Revisão 6.0.25 — auditoria final de produção real

- Estoque sincronizado com Supabase usando `await` antes de atualizar a tela.
- Pedido salvo sem itens agora tenta rollback automático.
- Kit salvo sem itens agora tenta rollback automático.
- Adicionado SQL consolidado `supabase/migracao-final-producao-6-0-30.sql` para banco novo ou antigo.
- Documentação: `docs/AUDITORIA-FINAL-PRODUCAO-REAL.md`.

## Revisão 6.0.30 — auditoria de estoque atômico

- Estoque de vendas, pedidos, cancelamentos, reabertura e comanda agora usa delta atômico no Supabase.
- Após movimentar estoque, o app recarrega produtos do Supabase para mostrar o valor real do banco.
- Ajuste manual de entrada/saída também usa delta; correção manual pode definir valor absoluto.
- Adicionada migração `supabase/migracao-final-producao-6-0-30.sql` com a função `apply_product_stock_deltas`.
- Falhas de estoque não são mais encobertas por mensagens de sucesso.
- Documentação: `docs/AUDITORIA-ESTOQUE-ATOMICO.md`.


## Revisão 6.0.30 — reserva de estoque antes de salvar pedido

- Pedidos do cliente, vendas de balcão, PDV Entregas e fechamento de comandas agora aplicam delta atômico de estoque antes de gravar a operação final.
- Se o pedido/venda não for salvo depois da reserva, o sistema tenta devolver o estoque automaticamente.
- O sistema não mantém pedido como sucesso quando a reserva de estoque no Supabase falha.
- Migração obrigatória: `supabase/migracao-final-producao-6-0-30.sql`.
