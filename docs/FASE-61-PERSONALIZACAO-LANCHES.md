# Fase 61 — Personalização de lanches

Versão: `6.0.49-fase-61-personalizacao-lanches`

## Objetivo

Transformar a experiência do cliente para operação de lanchonete, permitindo que cada lanche/porção/combo seja personalizado antes de entrar no carrinho.

## Implementado

- Modal de personalização no cardápio do cliente.
- Adicionais por item, com preço somado ao valor do lanche.
- Ingredientes removíveis por item.
- Observação individual por lanche.
- Carrinho exibindo adicionais, ingredientes removidos e observação.
- Carrinho separa lanches iguais com personalizações diferentes.
- Pedido salva personalização em `order_items`.
- Fila de impressão recebe adicionais, removidos e observações.
- Cupom de cozinha e entrega destacam preparo personalizado.

## Regras

- Produto comum continua entrando direto no carrinho.
- Lanche/porção/combo abre personalização.
- Se o produto tiver ingredientes, removíveis, adicionais ou observação habilitada, abre personalização.
- Estoque continua baixando pelo produto base, sem baixar adicionais automaticamente nesta fase.

## SQL obrigatório

Rode `supabase/migracao-final-producao-6-0-49.sql` no Supabase.

## Próxima fase sugerida

Fase 62 — Gestão de adicionais e ingredientes pela loja.
