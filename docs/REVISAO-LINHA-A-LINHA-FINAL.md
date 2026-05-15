# Revisão linha a linha final — Fase 50

Versão: `6.0.22-fase-50-auditoria-linha-a-linha-final`

## Correções aplicadas nesta revisão

1. Recadastro de produto excluído
   - A busca por código de barras agora avalia até 25 registros encontrados.
   - Produto ativo tem prioridade sobre produto excluído/inativo.
   - A reativação não atualiza mais todos os registros com o mesmo código de barras; agora reativa pelo `id` exato do produto reaproveitável.

2. Catálogo do cliente
   - Além do realtime do Supabase, o app faz atualização periódica silenciosa do catálogo.
   - Isso evita cliente com tela aberta ficar vendo produto/categoria antiga quando o realtime não estiver habilitado no projeto Supabase.

3. Cache/PWA
   - O app continua sem registrar service worker novo.
   - O carregamento tenta remover service workers e caches antigos.
   - O service worker mantido no pacote existe apenas para instalações antigas e usa rede sem armazenar dados operacionais.

4. Categorias
   - Categorias continuam vindo do Supabase em `store_settings.settings.productGroups`.
   - Categorias também são reconstruídas a partir dos produtos carregados para impedir desaparecimento após atualização da página.

## Validação executada

- `npm test`
- `npm run lint`
- `npm run build`
- `npm audit --audit-level=moderate`

## Observação

O app depende das variáveis `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` no deploy e das migrações SQL aplicadas no Supabase.
