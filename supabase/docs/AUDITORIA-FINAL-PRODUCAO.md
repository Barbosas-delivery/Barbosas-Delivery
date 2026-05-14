# Auditoria final de produção — Fase 50

Versão: `6.0.22-fase-50-auditoria-linha-a-linha-final`

## Correções críticas desta auditoria

1. O app não registra mais service worker novo. Na abertura, ele remove registros antigos e apaga caches antigos do navegador.
2. O `service-worker.js` permanece apenas para limpar instalações antigas e responder sempre via rede, sem `cache.addAll`, `caches.match` ou `cache.put`.
3. Categorias de produtos não são mais perdidas quando as configurações do Supabase carregam depois dos produtos. O carregamento remoto agora preserva grupos já reconstruídos pelos produtos carregados.
4. O bloqueio local de código de barras agora considera apenas produtos ativos/não excluídos, evitando impedir o recadastro de produto inativo/excluído.
5. A busca de produto por código de barras no Supabase usa lista limitada em vez de `.maybeSingle()`, evitando falha quando há duplicidade histórica.
6. Clientes e pedidos não iniciam mais com dados de demonstração na tela operacional; se o Supabase falhar, o app mostra lista vazia e aviso em vez de dados falsos.

## Validação obrigatória após deploy

- Abrir a loja em aba anônima.
- Confirmar no Diagnóstico que Supabase URL, chave e cliente estão ativos.
- Cadastrar um produto novo.
- Editar nome/preço/foto/categoria desse produto e conferir no cliente.
- Excluir o produto e cadastrar novamente com o mesmo código de barras.
- Criar uma categoria nova, atualizar a página e confirmar que ela permanece.
- Abrir o DevTools > Application e confirmar que não há service worker ativo controlando a página.

## Resultado dos comandos locais

Os comandos devem passar antes de publicar:

```bash
npm test
npm run lint
npm run build
npm audit --audit-level=moderate
```
