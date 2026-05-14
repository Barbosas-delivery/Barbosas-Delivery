-- Barbosa's Delivery - Fase 23 - Cupons de desconto

create table if not exists coupons (
  id bigint primary key,
  code text not null unique,
  description text default '',
  discount_type text not null default 'fixed',
  discount_value numeric not null default 0,
  minimum_order_value numeric not null default 0,
  max_discount numeric not null default 0,
  usage_limit integer not null default 0,
  used_count integer not null default 0,
  start_date date,
  end_date date,
  active boolean not null default true,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

alter table orders add column if not exists coupon_code text;
alter table orders add column if not exists coupon_id bigint;
alter table orders add column if not exists coupon_discount numeric default 0;

create index if not exists idx_coupons_code on coupons(code);
create index if not exists idx_coupons_active on coupons(active);
create index if not exists idx_orders_coupon_code on orders(coupon_code);
