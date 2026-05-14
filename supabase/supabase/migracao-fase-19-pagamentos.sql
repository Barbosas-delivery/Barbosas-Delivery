-- Barbosa's Delivery - Fase 19 - Pagamentos e caixa
-- Campos opcionais para registrar quando e por quem o recebimento foi confirmado.

alter table orders add column if not exists payment_confirmed_at timestamp with time zone;
alter table orders add column if not exists payment_confirmed_by text;

create index if not exists idx_orders_payment_status on orders(payment_status);
create index if not exists idx_orders_payment_confirmed_at on orders(payment_confirmed_at);
create index if not exists idx_order_payments_order_id_status on order_payments(order_id, status);
