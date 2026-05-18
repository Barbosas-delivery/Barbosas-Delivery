# Fase 60 — Conversão para Lanchonete

Versão: `6.0.48-fase-60-conversao-lanchonete`

## Objetivo

Converter a operação do Barbosa's Delivery de conveniência para lanchonete/delivery de lanches, preparando o cardápio para personalização por item e removendo a opção de fiado/comandas da navegação operacional.

## Alterações principais

- Identidade padrão alterada para Barbosa's Lanches.
- Categorias padrão ajustadas para lanchonete: Lanches, Combos, Porções, Bebidas, Sobremesas e Molhos/adicionais.
- Produtos iniciais e promoções de demonstração substituídos por itens de lanchonete.
- Cadastro de produto agora aceita tipo de cardápio: lanche, porção, bebida, combo, sobremesa e adicional/molho.
- Produtos agora carregam metadados para a próxima fase:
  - ingredientes padrão;
  - ingredientes removíveis;
  - adicionais sugeridos;
  - permissão de observação por item.
- Aba Fiados/Comandas removida da navegação da loja.
- Permissões de gerente/caixa não exibem mais a aba de comandas.
- Carregamento automático de `tab_accounts` e `tab_account_items` foi desativado na operação nova para evitar dependência de fiado.
- Textos de caixa e relatórios foram ajustados para não destacar fiado como fluxo operacional.

## O que não foi apagado

As tabelas e serviços de comandas/fiados não foram removidos do banco nesta fase. Eles ficam preservados por segurança histórica, mas fora da interface operacional.

## Próxima fase recomendada

Fase 61 — Personalização de lanches:

- escolher adicionais pagos por lanche;
- remover ingredientes por lanche;
- observação individual por item;
- carrinho separando lanches iguais com personalizações diferentes;
- impressão da cozinha destacando adicionais/removidos/observação.
