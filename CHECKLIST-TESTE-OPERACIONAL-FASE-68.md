# Checklist de teste operacional — Fase 68

Use este checklist depois de rodar o SQL da Fase 68.

## Supabase

- [ ] Rodou `supabase/migracao-final-producao-6-0-56.sql`.
- [ ] Rodou `select * from public.run_phase_68_operational_test('Gabriel', true);`.
- [ ] Resultado retornou `status = passed`.
- [ ] Resultado retornou `ready_percent = 100`.

## Operação validada

- [ ] Caixa abriu.
- [ ] Suprimento foi registrado.
- [ ] Sangria foi registrada.
- [ ] Delivery foi criado.
- [ ] Pedido foi aceito.
- [ ] Pedido saiu para entrega.
- [ ] Entrega foi confirmada.
- [ ] Venda balcão foi criada e paga.
- [ ] Comanda foi criada, recebeu itens e fechou como venda.
- [ ] Estoque da bebida baixou.
- [ ] Lanche não controlou estoque.
- [ ] Impressões entraram na fila.
- [ ] Pedido cancelado tem motivo.
- [ ] Caixa fechou com resumo financeiro.
- [ ] Auditoria e notificações foram criadas.
- [ ] Limpeza dos dados de teste funcionou.

## Impressão física

- [ ] Abrir app Desktop no PC da loja.
- [ ] Confirmar impressora configurada.
- [ ] Confirmar que a fila de impressão aparece.
- [ ] Imprimir teste físico de cozinha.
- [ ] Imprimir teste físico de entrega.
- [ ] Imprimir teste físico de balcão/comanda.
