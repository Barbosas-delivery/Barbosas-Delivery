# Fase 45 — Estoque no PDV

Esta fase reforça a validação de estoque no **PDV Balcão** e no **PDV Entregas**.

## Regra principal

- Cliente online continua bloqueado quando o produto está sem estoque.
- PDV Balcão e PDV Entregas bloqueiam a venda sem estoque para caixa e operador.
- Gerente e administrador podem autorizar venda sem estoque com confirmação.
- Toda autorização de venda sem estoque é registrada na auditoria como `pdv_stock_override`.

## Quando aparece a autorização

A autorização aparece quando o sistema identifica:

- produto sem estoque;
- quantidade maior que o estoque disponível;
- kit com item interno sem estoque suficiente.

## Perfis

| Perfil | Pode autorizar venda sem estoque? |
| --- | --- |
| Administrador | Sim |
| Gerente | Sim |
| Caixa | Não |
| Operador | Não |

## Observação operacional

Quando a venda sem estoque é autorizada, o estoque do produto não fica negativo no sistema; ele permanece zerado. Use o histórico/auditoria e o ajuste manual de estoque para corrigir o cadastro depois.
