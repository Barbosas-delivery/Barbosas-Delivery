# Fase 72 — Reteste operacional completo pós-cupom térmico

Versão: `6.0.60-fase-72-reteste-operacional-completo`

Esta fase não altera o fluxo principal de venda. Ela consolida um novo reteste depois das correções reais encontradas em produção:

- cadastro real de adicionais por categoria;
- estoque de lanchonete sem bloquear lanche/porção/combo;
- cupom térmico corrigido para 80mm/58mm;
- validação de caixa, delivery, balcão, comanda, impressão e cancelamento.

## O que deve ser testado manualmente no PC da loja

1. Criar adicional em **Painel da loja → Adicionais**.
2. Criar lanche com estoque zerado e estoque desligado.
3. Criar bebida com estoque controlado.
4. Vender lanche + bebida no balcão.
5. Abrir comanda, adicionar itens, imprimir adição, imprimir consumo e fechar.
6. Criar pedido delivery, aceitar, sair para entrega e confirmar entrega.
7. Abrir caixa, fazer venda, sangria, suprimento e fechar caixa.
8. Confirmar que os cupons saem centralizados e legíveis na impressora térmica.

## Próxima etapa planejada

Depois deste reteste, a próxima fase recomendada é:

`Fase 73 — Personalização da marca: nome da loja e foto/logo`

Ela deve permitir trocar `BARBOSAS LANCHES`, logo/foto e dados visuais sem precisar mexer no código.
