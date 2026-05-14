# Fase 50 — Revisão final de produção

Esta fase fecha o ciclo antes da publicação do Barbosa's Delivery.

## Objetivo

Garantir que o aplicativo esteja pronto para subir em produção com validações claras de ambiente, build, PWA, Supabase e operação diária.

## O que foi revisado

- Teste de fumaça automatizado.
- Build de produção pelo Vite.
- Lint do projeto.
- Cache do PWA com nova versão para evitar celular preso em versão antiga.
- Diagnóstico da conexão Supabase.
- Variáveis de ambiente obrigatórias para produção.
- Checklist de publicação.

## Ajuste técnico importante

O cliente Supabase agora só é ativado quando as duas variáveis abaixo estão configuradas:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Se alguma delas estiver ausente, o app não quebra na tela inicial; ele mostra pendência no diagnóstico e retorna erro controlado nas chamadas ao Supabase. Para operação real, as duas variáveis continuam obrigatórias.

## Antes de publicar amanhã

1. Rode todos os SQLs da pasta `supabase` no projeto correto do Supabase.
2. Configure as variáveis de ambiente no serviço de hospedagem.
3. Faça o deploy.
4. Abra a aba **Diagnóstico** e confirme todos os itens críticos.
5. Faça um pedido real de teste pelo celular.
6. Confirme chegada no painel da loja.
7. Confirme impressão, WhatsApp, entregador, pagamento e relatório.
8. Baixe um backup operacional.
9. Troque a senha inicial do administrador, se ainda estiver usando a senha padrão.

## Status final

A fase atualiza a versão para:

`6.0.22-fase-50-auditoria-linha-a-linha-final`
