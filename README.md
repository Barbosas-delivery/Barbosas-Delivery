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

`6.0.36-fase-50-comandas-transacionais`

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
- Adicionado SQL consolidado `supabase/migracao-final-producao-6-0-32.sql` para banco novo ou antigo.
- Documentação: `docs/AUDITORIA-FINAL-PRODUCAO-REAL.md`.

## Revisão 6.0.30 — auditoria de estoque atômico

- Estoque de vendas, pedidos, cancelamentos, reabertura e comanda agora usa delta atômico no Supabase.
- Após movimentar estoque, o app recarrega produtos do Supabase para mostrar o valor real do banco.
- Ajuste manual de entrada/saída também usa delta; correção manual pode definir valor absoluto.
- Adicionada migração `supabase/migracao-final-producao-6-0-32.sql` com a função `apply_product_stock_deltas`.
- Falhas de estoque não são mais encobertas por mensagens de sucesso.
- Documentação: `docs/AUDITORIA-ESTOQUE-ATOMICO.md`.


## Revisão 6.0.30 — reserva de estoque antes de salvar pedido

- Pedidos do cliente, vendas de balcão, PDV Entregas e fechamento de comandas agora aplicam delta atômico de estoque antes de gravar a operação final.
- Se o pedido/venda não for salvo depois da reserva, o sistema tenta devolver o estoque automaticamente.
- O sistema não mantém pedido como sucesso quando a reserva de estoque no Supabase falha.
- Migração obrigatória: `supabase/migracao-final-producao-6-0-32.sql`.


## Revisão 6.0.36 — revisão total do script final

- Corrigida a função `apply_product_stock_deltas` para operar em modo tudo-ou-nada: se um item do pedido falhar por falta de estoque, nenhum produto do pedido tem estoque baixado.
- Corrigida edição de produto para não sobrescrever estoque antigo junto com nome/preço/categoria. Quando o estoque muda na edição, o app consulta o saldo atual no Supabase e aplica apenas o delta atômico.
- Adicionada migração obrigatória `supabase/migracao-final-producao-6-0-36.sql`.
- Reforçados testes de fumaça para bloquear retorno de baixa parcial e gravação direta de estoque em edição.

## Revisão 6.0.32 — revisão completa do script

- Corrigida a migração final de produção: a tabela `cash_sessions` não possui mais a coluna `total_sold` duplicada, evitando falha ao rodar em banco Supabase novo.
- Categoria nova agora só aparece como criada depois de salvar `store_settings` no Supabase; se falhar, a tela não finge que a categoria foi persistida.
- Ajuste manual de estoque passou a usar a função atômica `apply_product_stock_deltas`, removendo gravação direta do saldo final em `products.stock`.
- Teste de fumaça reforçado para impedir retorno desses problemas.

## Revisão 6.0.36 — schema completo e kits transacionais

- Migração final reforça colunas de tabelas antigas, não apenas cria tabelas novas.
- Edição de kits usa `replace_kit_items` para evitar itens apagados sem reposição em falha de INSERT.
- Migração obrigatória: `supabase/migracao-final-producao-6-0-36.sql`.

## Revisão 6.0.36 — comandas transacionais

- Itens de comanda/fiado agora são substituídos pela função SQL `replace_tab_account_items`.
- Isso evita perder itens caso a atualização da comanda falhe entre apagar os itens antigos e gravar os novos.
- Migração obrigatória: `supabase/migracao-final-producao-6-0-36.sql`.


### Versão 6.0.37-fase-50-corrige-imports-vercel

Correção de deploy na Vercel: imports de componentes com extensão explícita `.jsx` e confirmação da pasta `src/components`.

## Fase 51 — Pedido direto sem aprovação

Versão: `6.0.38-fase-51-pedido-direto-sem-aprovacao`

- Pedido feito pelo aplicativo do cliente entra direto como **Aguardando retirada**.
- Removida a necessidade de aprovação manual da loja para pedido novo.
- Estoque continua sendo reservado antes de salvar o pedido.
- Pedidos antigos aguardando aprovação são liberados pela migração final.
- Migração obrigatória: `supabase/migracao-final-producao-6-0-39.sql`.


## Fase 52 — Fila de impressão no Supabase

Versão: `6.0.39-fase-52-fila-impressao-supabase`

- Cria a tabela `print_jobs` para o aplicativo Electron consumir impressões pendentes.
- Pedido do app gera 2 jobs: `kitchen` e `delivery`.
- PDV Entregas gera 2 jobs: `kitchen` e `delivery`.
- PDV Balcão gera 1 job: `counter`.
- A impressão automática do navegador fica desativada como solução principal para evitar pop-ups, duplicidade e perda por atualização de página.
- Migração obrigatória: `supabase/migracao-final-producao-6-0-39.sql`.
