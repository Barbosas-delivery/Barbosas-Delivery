-- Barbosa's Delivery - Fase 35
-- Promoções, reabertura de vendas balcão e controle operacional de atrasos.

alter table promotions add column if not exists active boolean default true;
alter table promotions add column if not exists deleted_at timestamp with time zone;

alter table orders add column if not exists reopened_at timestamp with time zone;
alter table orders add column if not exists reopened_by text;
alter table orders add column if not exists reopen_reason text;
alter table orders add column if not exists delay_alerted_at timestamp with time zone;

create index if not exists idx_promotions_deleted_at on promotions(deleted_at);
create index if not exists idx_orders_reopened_at on orders(reopened_at);
