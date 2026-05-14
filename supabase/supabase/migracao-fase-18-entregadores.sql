-- Barbosa's Delivery - Fase 18
-- Função opcional para aceitar entrega com proteção contra dois entregadores aceitarem o mesmo pedido.
-- Rode no SQL Editor do Supabase se quiser deixar o aceite do entregador mais seguro.

create or replace function accept_delivery_order(
  p_order_id text,
  p_courier_username text,
  p_courier_name text
)
returns jsonb
language plpgsql
security definer
as $$
declare
  updated_count integer;
begin
  update orders
     set status = 'Saiu para entrega',
         accepted_by_username = coalesce(p_courier_username, ''),
         accepted_by_name = coalesce(p_courier_name, ''),
         accepted_at = now(),
         picked_up_by_username = coalesce(p_courier_username, ''),
         picked_up_by_name = coalesce(p_courier_name, ''),
         picked_up_at = now()
   where id = p_order_id
     and status = 'Aguardando retirada'
     and coalesce(picked_up_by_username, '') = ''
     and coalesce(accepted_by_username, '') = '';

  get diagnostics updated_count = row_count;

  if updated_count = 1 then
    return jsonb_build_object('success', true, 'message', 'Entrega aceita.');
  end if;

  return jsonb_build_object('success', false, 'message', 'Entrega indisponível ou já aceita por outro entregador.');
end;
$$;
