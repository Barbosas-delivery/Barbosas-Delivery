-- Barbosa's Delivery - Fase 37
-- Produto pausado temporariamente e loja pausada por configurações.

alter table products add column if not exists paused_until timestamp with time zone;
alter table products add column if not exists pause_reason text;

create index if not exists idx_products_paused_until on products(paused_until);
