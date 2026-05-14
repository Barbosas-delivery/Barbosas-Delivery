-- Barbosa's Delivery - Migração complementar das fases 1 a 12
-- Rode este arquivo no SQL Editor do Supabase.
-- Ele usa IF NOT EXISTS para evitar erro caso alguma coluna já exista.

-- Produtos: exclusão lógica, foto e sabores/variações
alter table products add column if not exists active boolean default true;
alter table products add column if not exists deleted_at timestamp with time zone;
alter table products add column if not exists has_variants boolean default false;
alter table products add column if not exists variants jsonb default '[]'::jsonb;

-- Clientes: exclusão lógica
alter table clients add column if not exists active boolean default true;
alter table clients add column if not exists deleted_at timestamp with time zone;

-- Entregadores: exclusão lógica
alter table couriers add column if not exists active boolean default true;
alter table couriers add column if not exists deleted_at timestamp with time zone;

-- Pedidos: entrega automática, WhatsApp, aprovação, entregador, finalização e cancelamento
alter table orders add column if not exists estimated_delivery_minutes integer default 0;
alter table orders add column if not exists whatsapp_status text default 'not_sent';
alter table orders add column if not exists whatsapp_opened_at timestamp with time zone;
alter table orders add column if not exists whatsapp_sent_at timestamp with time zone;
alter table orders add column if not exists whatsapp_message text;
alter table orders add column if not exists needs_store_approval boolean default false;
alter table orders add column if not exists store_order_approved boolean default true;
alter table orders add column if not exists approved_at timestamp with time zone;
alter table orders add column if not exists accepted_by_username text;
alter table orders add column if not exists accepted_by_name text;
alter table orders add column if not exists accepted_at timestamp with time zone;
alter table orders add column if not exists refused_by_username text;
alter table orders add column if not exists refused_at timestamp with time zone;
alter table orders add column if not exists finalized_at timestamp with time zone;
alter table orders add column if not exists finalized_by text;
alter table orders add column if not exists problem_reason text;
alter table orders add column if not exists problem_at timestamp with time zone;
alter table orders add column if not exists proof_url text;
alter table orders add column if not exists picked_up_by_username text;
alter table orders add column if not exists picked_up_by_name text;
alter table orders add column if not exists picked_up_at timestamp with time zone;
alter table orders add column if not exists delivered_by_username text;
alter table orders add column if not exists delivered_by_name text;
alter table orders add column if not exists delivered_at timestamp with time zone;
alter table orders add column if not exists owner_approved boolean default false;
alter table orders add column if not exists owner_approved_at timestamp with time zone;
alter table orders add column if not exists cancelled_at timestamp with time zone;
alter table orders add column if not exists cancellation_reason text;
alter table orders add column if not exists launched_at timestamp with time zone default now();
alter table orders add column if not exists order_type text default 'delivery';
alter table orders add column if not exists origin_type text;
alter table orders add column if not exists tab_account_id bigint;
alter table orders add column if not exists courier_username text default 'ALL';
alter table orders add column if not exists courier_name text default 'Todos os motoboys';
alter table orders add column if not exists cash_session_id text;
alter table orders add column if not exists payment_status text default 'pending';
alter table orders add column if not exists products_total numeric default 0;
alter table orders add column if not exists delivery_fee numeric default 0;
alter table orders add column if not exists discount numeric default 0;
alter table orders add column if not exists courier_fee numeric default 0;
alter table orders add column if not exists store_fee numeric default 0;
alter table orders add column if not exists motorcycle_type text;

-- Itens do pedido: kits, caixa e código de barras
alter table order_items add column if not exists cash_session_id text;
alter table order_items add column if not exists barcode text;
alter table order_items add column if not exists is_kit boolean default false;
alter table order_items add column if not exists kit_id bigint;

-- Notificações: entregador específico, cliente específico e limpeza de notificações antigas
alter table notifications add column if not exists courier_username text;
alter table notifications add column if not exists customer_phone text;
alter table notifications add column if not exists read_at timestamp with time zone;
alter table notifications add column if not exists resolved_at timestamp with time zone;

-- Pagamentos detalhados do caixa
create table if not exists order_payments (
  id bigint generated by default as identity primary key,
  order_id text,
  cash_session_id text,
  method text not null default 'Outro',
  amount numeric not null default 0,
  status text not null default 'paid',
  notes text,
  created_at timestamp with time zone default now()
);

-- Índices leves para melhorar painéis com muitos pedidos/notificações
create index if not exists idx_orders_status on orders(status);
create index if not exists idx_orders_launched_at on orders(launched_at);
create index if not exists idx_orders_phone on orders(phone);
create index if not exists idx_notifications_audience on notifications(audience);
create index if not exists idx_notifications_order_id on notifications(order_id);
create index if not exists idx_notifications_customer_phone on notifications(customer_phone);
create index if not exists idx_notifications_resolved_at on notifications(resolved_at);
