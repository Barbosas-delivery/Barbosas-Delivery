# Correção emergencial final — Fase 50 corrigida

Versão: `6.0.22-fase-50-auditoria-linha-a-linha-final`

## Problemas corrigidos

1. **Categorias sumindo ao atualizar a página**
   - As categorias agora entram nas configurações sincronizadas no Supabase (`store_settings.settings.productGroups`).
   - Ao carregar produtos, o sistema também reconstrói a lista de categorias a partir das categorias existentes nos produtos.

2. **Produto excluído impedindo novo cadastro com o mesmo código de barras**
   - Antes, a exclusão lógica mantinha o registro no Supabase e podia continuar bloqueando o código.
   - Agora, ao tentar cadastrar um produto com código já existente em um produto excluído/inativo, o sistema reativa o cadastro antigo e atualiza os dados informados.

3. **Produto editado não refletindo corretamente para o cliente**
   - Depois de salvar edição, o sistema força recarregamento dos produtos direto do Supabase.
   - A categoria do produto editado também é preservada na lista sincronizada de grupos.

4. **Cache do navegador/service worker**
   - O service worker foi alterado para política `network-only`.
   - Ele limpa caches antigos na ativação e não salva HTML, JS, CSS ou dados operacionais em cache.

5. **Configurações importantes fora do localStorage**
   - Configurações da loja e categorias não são mais carregadas de localStorage.
   - A fonte principal passa a ser Supabase. O localStorage ficou apenas para dados não críticos, como lembrete local de backup e avisos fechados pelo cliente.

## Validações executadas

- `npm test`
- `npm run lint`
- `npm run build`
- `npm audit --audit-level=moderate`

Todas passaram.

## Atenção antes de publicar

Depois de enviar esta versão ao ar, abra a aplicação uma vez em cada celular/computador usado pela loja. O novo service worker remove os caches antigos na ativação, mas o navegador só executa essa limpeza quando a página é aberta novamente.
