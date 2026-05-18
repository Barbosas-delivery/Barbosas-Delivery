# Fase 62 — Impressão de cozinha otimizada

Versão: `6.0.50-fase-62-impressao-cozinha-otimizada`

## Objetivo

A Fase 62 melhora os cupons térmicos de 80mm para operação real de lanchonete, principalmente a via da cozinha.

## Entregas principais

- Via de cozinha com itens grandes e separados por preparo.
- Destaque visual para adicionais, ingredientes removidos e observação por item.
- Via de entrega com caixa de endereço, cliente, pagamento, totais e resumo correto do pedido.
- Via de balcão adaptada para lanches personalizados, com preços e totais.
- Payload da fila `print_jobs` atualizado para template `6.0.50`.
- Migração SQL `supabase/migracao-final-producao-6-0-50.sql` com metadados operacionais da fila, view de auditoria e funções de reimpressão/limpeza.

## Como fica a via da cozinha

```txt
BARBOSA'S LANCHES
COZINHA

PEDIDO #123
Cliente: João
Horário: 18/05/2026 20:35

ITEM 1
2x X-BACON

ADICIONAIS
+ Bacon extra
+ Cheddar

REMOVER / SEM
SEM CEBOLA
SEM TOMATE

OBS DO ITEM
Carne bem passada
```

## Como fica a via de entrega

A via de entrega não tenta substituir a cozinha. Ela prioriza:

- cliente;
- telefone;
- endereço;
- bairro/zona;
- entregador;
- forma de pagamento;
- total;
- resumo dos itens.

## Banco de dados

Rode no Supabase:

```txt
supabase/migracao-final-producao-6-0-50.sql
```

Essa migração é segura para bancos já existentes porque usa `if not exists`, `create or replace` e atualizações compatíveis.

## Teste recomendado

1. Criar pedido pelo app com lanche personalizado.
2. Selecionar pelo menos dois adicionais.
3. Remover pelo menos dois ingredientes.
4. Inserir observação no item.
5. Inserir observação geral no pedido.
6. Conferir se a fila cria `kitchen` e `delivery`.
7. Conferir se a cozinha imprime sem preço e com preparo destacado.
8. Conferir se a entrega imprime endereço e pagamento corretamente.
9. Criar venda balcão com personalização e conferir a via `counter`.
