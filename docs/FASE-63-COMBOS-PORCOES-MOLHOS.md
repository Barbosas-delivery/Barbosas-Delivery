# Fase 63 — Combos, porções, molhos e sugestões de venda

Versão: `6.0.51-fase-63-combos-porcoes-molhos`

## Objetivo

Evoluir o cardápio de lanchonete para trabalhar melhor com combos, porções, molhos e venda adicional, sem quebrar o fluxo de personalização criado nas fases anteriores.

## Entregas principais

- Cadastro de produto agora aceita campos próprios para lanchonete:
  - escolhas de combo/porção;
  - limite de molhos grátis;
  - tempo de preparo estimado;
  - selos comerciais, como “Mais vendido” e “Recomendado”;
  - sugestões de produtos relacionados por ID.
- Cliente consegue escolher opções de combo/porção na tela de personalização.
- Escolhas obrigatórias são validadas antes de adicionar ao carrinho.
- Escolhas com acréscimo entram no preço final do item.
- Carrinho diferencia itens iguais com escolhas de combo diferentes.
- Carrinho exibe escolhas, adicionais, ingredientes removidos e observação por item.
- Impressão recebe as escolhas de combo no payload e destaca no cupom da cozinha.
- Banco preparado com novas colunas em `products` e `order_items`.

## Formato para cadastrar escolhas de combo/porção

No campo **Escolhas de combo/porção**, use uma linha por escolha:

```txt
Escolha a bebida|Coca lata;Guaraná lata;Fanta lata|obrigatório|1
Escolha o molho|Maionese verde;Barbecue;Cheddar extra+2||1
Escolha os acompanhamentos|Batata pequena;Anéis de cebola+4;Nuggets+5||2
```

Formato:

```txt
Nome da escolha|opção 1;opção 2+preço|obrigatório|máximo
```

Exemplos:

```txt
Escolha a bebida|Coca lata;Guaraná lata;Fanta lata|obrigatório|1
```

```txt
Molho da porção|Maionese verde;Barbecue;Cheddar extra+2||1
```

## SQL

Arquivo criado:

```txt
supabase/migracao-final-producao-6-0-51.sql
```

## Testes executados

- `npm run lint`
- `npm run build`

## Observação operacional

A fase 63 não remove as personalizações anteriores. Ela adiciona uma camada para combos, porções e molhos, mantendo adicionais, ingredientes removíveis e observação por item.
