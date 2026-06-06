-- p1_391 — Cost Calculator (Shipment landed-cost). Persistent shipments + items.
-- Landed/unit = goods(RMB*ex) + SF(RMB*sf%*ex, by value) + shipping(RM/qty) + part-timer(RM/qty).
-- Applied to the project already (this file is the record).

create table if not exists public.cost_shipments (
  id bigserial primary key,
  label text,
  po_ref text,
  exchange_rate numeric not null default 0,
  sf_pct numeric not null default 5,
  shipping_cost_rm numeric not null default 0,
  parttimer_cost_rm numeric not null default 0,
  note text,
  created_by text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.cost_shipment_items (
  id bigserial primary key,
  shipment_id bigint references public.cost_shipments(id) on delete cascade,
  sku text,
  product_name text,
  cost_rmb numeric not null default 0,
  qty integer not null default 0,
  sort_idx int default 0,
  created_at timestamptz default now()
);

create index if not exists idx_cost_shipment_items_shipment on public.cost_shipment_items(shipment_id);

alter table public.cost_shipments enable row level security;
alter table public.cost_shipment_items enable row level security;

drop policy if exists "Allow full access" on public.cost_shipments;
create policy "Allow full access" on public.cost_shipments for all to public using (true) with check (true);
drop policy if exists "Allow full access" on public.cost_shipment_items;
create policy "Allow full access" on public.cost_shipment_items for all to public using (true) with check (true);

grant all on public.cost_shipments to anon, authenticated, service_role;
grant all on public.cost_shipment_items to anon, authenticated, service_role;
grant usage, select on sequence public.cost_shipments_id_seq to anon, authenticated, service_role;
grant usage, select on sequence public.cost_shipment_items_id_seq to anon, authenticated, service_role;
