# Fase 66 — Lanchonete Pro: cadastro simplificado, adicionais por categoria, combos e comandas no PDV

Versão: `6.0.54-fase-66-lanchonete-pro-comandas-pdv`

## Objetivo

Transformar o cadastro e o atendimento em um fluxo mais profissional para lanchonete: menos campos obrigatórios no lanche, adicionais centralizados por categoria, combos no lugar de kits e comandas integradas ao PDV Balcão.

## Principais mudanças

- Cadastro de produto ficou mais simples para lanches.
- Adicionais agora são cadastrados por categoria.
- O cliente não vê estoque no cardápio para lanches, porções e combos.
- Lanches, porções e combos ficam sem controle de estoque por padrão.
- Bebidas, sobremesas e produtos simples podem continuar controlando estoque.
- A interface passa a usar o termo **Combos** no lugar de **Kits**.
- Comanda deixa de ser tratada como fiado.
- O PDV Balcão agora permite criar comanda a partir dos itens lançados como venda normal.
- Comanda exige número de 1 a 100, mesa e nome completo do responsável.
- Itens adicionados depois na comanda são enviados para impressão.
- A comanda pode imprimir consumo completo.
- O fechamento da comanda vira venda normal no caixa.

## Regra operacional

A comanda não representa dívida. Ela é apenas um consumo aberto na mesa. Quando o cliente fecha, o sistema registra a venda normalmente, com pagamento e baixa de estoque apenas dos itens configurados para controlar estoque.
