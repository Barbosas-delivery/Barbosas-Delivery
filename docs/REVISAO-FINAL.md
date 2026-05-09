# Revisão final do Barbosa's Delivery

Versão revisada: `6.0.1-final`.

## Validações executadas

- `npm install`
- `npm run lint`
- `npm run test`
- `npm run build`

## Áreas conferidas

- Cliente mobile, carrinho, sabores, cupom e checkout.
- Loja, aprovação/cancelamento/finalização de pedidos.
- Entregador, aceite, recusa, rota, WhatsApp e conclusão de entrega.
- Caixa, pagamentos, reabertura de recebimento e fechamento.
- Produtos, estoque, cupons, relatórios e backup.
- Impressão por navegador e preparação para serviço local.
- PWA, service worker, diagnóstico e documentação.

## Observação operacional

Para funcionamento completo em produção, rode todos os SQLs da pasta `supabase/` no projeto correto do Supabase e confira as permissões/RLS conforme a configuração do seu banco.
