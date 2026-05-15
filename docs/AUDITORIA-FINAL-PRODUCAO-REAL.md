# Auditoria final de produção real — Fase 50

Versão: `6.0.25-fase-50-auditoria-final-producao-real`

Esta revisão foi feita para reduzir riscos que passam em build/lint, mas aparecem no uso real da loja.

## Correções adicionais

- Estoque passa a ser persistido no Supabase com `await` antes de atualizar a tela em pedidos, balcão, cancelamentos, reabertura de venda e fechamento de comanda.
- Se o pedido principal for salvo mas os itens falharem, o sistema tenta remover o pedido principal para evitar pedido sem itens no banco.
- Se um kit for criado mas os itens falharem, o sistema tenta remover o kit principal para evitar kit incompleto.
- Adicionado SQL consolidado `supabase/migracao-final-producao-6-0-25.sql` para criar tabelas essenciais em um Supabase novo ou reforçar um banco antigo.
- Mantido sem cache operacional: sem registro de service worker novo e com limpeza de caches antigos.

## Antes do deploy

1. Rode `supabase/migracao-final-producao-6-0-25.sql` no SQL Editor do Supabase.
2. Configure `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` no provedor de hospedagem.
3. Publique o app.
4. Abra a aba Diagnóstico e confirme Cliente Supabase ativo.
5. Faça os testes práticos do checklist de produção.
