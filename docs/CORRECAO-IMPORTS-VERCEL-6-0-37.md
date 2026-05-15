# Correção Vercel 6.0.37

## Problema

O deploy na Vercel falhou porque o repositório publicado não encontrou os módulos:

- `src/components/ui.jsx`
- `src/components/OperationalPanels.jsx`

## Correção

- Os imports em `src/App.jsx` agora usam extensão explícita `.jsx`.
- O pacote inclui a pasta `src/components/` com os dois arquivos obrigatórios.
- A versão foi atualizada para `6.0.37-fase-50-corrige-imports-vercel`.

## Antes de publicar

No GitHub, confirme que estes arquivos existem exatamente com estes nomes, respeitando maiúsculas/minúsculas:

```txt
src/components/ui.jsx
src/components/OperationalPanels.jsx
```

A Vercel roda em Linux, então diferença de maiúsculas/minúsculas pode quebrar o build mesmo funcionando no Windows.
