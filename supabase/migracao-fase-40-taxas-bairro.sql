-- Fase 40 - Taxas por bairro / região de entrega
-- As configurações ficam em store_settings.settings (jsonb), então não é preciso alterar a tabela store_settings.
-- Estas colunas ajudam a preservar no pedido qual bairro/região foi usado no cálculo da taxa.

alter table orders add column if not exists delivery_district text;
alter table orders add column if not exists delivery_zone text;

create index if not exists idx_orders_delivery_district on orders(delivery_district);
create index if not exists idx_orders_delivery_zone on orders(delivery_zone);
