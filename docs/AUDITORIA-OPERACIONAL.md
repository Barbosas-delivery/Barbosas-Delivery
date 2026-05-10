# Auditoria operacional

A Fase 47 adiciona uma aba **Auditoria** no painel da loja para consultar ações importantes do sistema.

## O que aparece

A tela mostra registros de ações como:

- aprovação de pedidos;
- aceite e finalização de entregas;
- cancelamento de pedidos/vendas;
- reabertura de venda no PDV;
- confirmação ou reabertura de pagamento;
- ajustes de estoque;
- exclusão de promoção;
- autorização de venda sem estoque;
- criação/edição de usuários;
- impressões e exportações.

## Filtros

É possível filtrar por:

- texto livre;
- tipo de usuário: loja, entregador, cliente ou sistema;
- tipo de ação.

## Exportação

O botão **CSV auditoria** baixa os registros filtrados em planilha `.csv`.

## Supabase

Esta tela usa a tabela `audit_logs`, criada na migração da Fase 36. Se a aba aparecer vazia ou com aviso de erro, rode a migração da Fase 36 antes de usar em produção.
