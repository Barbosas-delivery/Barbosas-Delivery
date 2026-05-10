# Revisão final

## Status da versão

Versão final revisada: `6.0.18-fase-50-revisao-final-producao`.

## Validações obrigatórias

Antes de colocar o aplicativo no ar, execute:

```bash
npm ci
npm run test
npm run lint
npm run build
```

## Ambiente de produção

Configure no provedor de hospedagem:

```bash
VITE_SUPABASE_URL=https://SEU-PROJETO.supabase.co
VITE_SUPABASE_ANON_KEY=SUA_CHAVE_ANON_PUBLICA_DO_SUPABASE
```

Sem essas variáveis, o sistema abre sem travar, mas a sincronização real com o Supabase fica desativada e a aba Diagnóstico mostra pendência.

## Pontos que exigem conferência manual

- SQLs aplicados no Supabase correto.
- Políticas/RLS permitindo as operações necessárias da loja.
- Senha padrão do administrador trocada.
- Impressão testada no computador real da loja.
- Pedido de teste feito em celular real.
- WhatsApp abrindo com número e mensagem corretos.
- PWA reinstalado no celular se uma versão antiga estiver em cache.
