-- Barbosa's Delivery - Fase 14
-- Configurações da loja sincronizadas no Supabase.

create table if not exists store_settings (
  id text primary key,
  settings jsonb not null default '{}'::jsonb,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

insert into store_settings (id, settings)
values ('default', '{}'::jsonb)
on conflict (id) do nothing;
