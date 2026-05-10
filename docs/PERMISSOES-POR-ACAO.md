# Permissões por ação e limites de desconto

A Fase 44 reforça o controle operacional por perfil de usuário da loja.

## Perfis

- **Administrador**: acesso total e sem limite de desconto manual.
- **Gerente**: pode operar pedidos, estoque, promoções, produtos e reabrir vendas. Desconto manual até R$ 30,00.
- **Caixa**: pode confirmar/reabrir recebimentos, reabrir venda no PDV e exportar relatórios. Desconto manual até R$ 10,00.
- **Operador**: pode aprovar pedido e confirmar pagamento. Desconto manual até R$ 5,00.

## Ações protegidas

O sistema bloqueia ações sensíveis pelo perfil logado:

- cancelar pedidos ou vendas;
- reabrir recebimentos;
- reabrir venda no PDV;
- finalizar entrega manualmente;
- ajustar estoque;
- excluir promoção;
- pausar/retomar produto;
- ativar/inativar produto.

## Desconto manual

Os descontos manuais no PDV Balcão e no PDV Entregas são limitados por perfil. Se o usuário tentar passar do limite, o sistema reduz/bloqueia e orienta a pedir autorização de perfil superior.

## Observação

Cupons de desconto continuam seguindo as regras do próprio cupom. Esta fase controla principalmente desconto manual informado por operador da loja.
