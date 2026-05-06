-- Sprint 2 schema migrations (idempotent; run via Supabase Management API)
-- 2026-05-06

-- =================================================================
-- S2.2 SUPPLIERS — master supplier directory
-- =================================================================
CREATE TABLE IF NOT EXISTS public.suppliers (
    id              bigserial PRIMARY KEY,
    name            text NOT NULL UNIQUE,
    country         text,
    contact_person  text,
    phone           text,
    email           text,
    payment_terms   text,        -- e.g. "Net 30", "COD", "50% deposit"
    lead_time_days  integer,
    currency        text DEFAULT 'RM',
    notes           text,
    is_active       boolean NOT NULL DEFAULT true,
    created_at      timestamptz NOT NULL DEFAULT now(),
    version         integer NOT NULL DEFAULT 1
);

-- Seed the 11 brands we already have so PO can immediately reference them
INSERT INTO public.suppliers (name, country, currency, is_active)
VALUES
    ('10 Camp Official Store', 'MY', 'RM', true),
    ('Naturehike',             'CN', 'CNY', true),
    ('SHINE TRIP',             'CN', 'CNY', true),
    ('Black Dog',              'CN', 'CNY', true),
    ('Chanodug',               'CN', 'CNY', true),
    ('Mobi Garden',            'CN', 'CNY', true),
    ('Vidalido',               'CN', 'CNY', true),
    ('Mountainhiker',          'CN', 'CNY', true),
    ('LFO',                    'CN', 'CNY', true),
    ('Opolar',                 'CN', 'CNY', true)
ON CONFLICT (name) DO NOTHING;

-- =================================================================
-- S2.1 PURCHASE_ORDERS — proper PO header table
-- =================================================================
CREATE TABLE IF NOT EXISTS public.purchase_orders (
    id              bigserial PRIMARY KEY,
    po_number       text NOT NULL UNIQUE,
    supplier_id     bigint REFERENCES public.suppliers(id),
    supplier_name   text,         -- denormalised snapshot at PO time
    eta_date        date,
    received_date   date,
    status          text NOT NULL DEFAULT 'Draft',  -- Draft / Pending / Partial / Completed / Cancelled
    currency        text DEFAULT 'RM',
    fx_rate         numeric,      -- to RM at PO time, optional
    subtotal_rm     numeric DEFAULT 0,
    shipping_rm     numeric DEFAULT 0,
    tax_rm          numeric DEFAULT 0,
    total_rm        numeric DEFAULT 0,
    created_by      text,
    received_by     text,
    notes           text,
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now(),
    version         integer NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS public.purchase_order_items (
    id              bigserial PRIMARY KEY,
    po_id           bigint NOT NULL REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
    po_number       text,         -- denorm
    sku             text NOT NULL,
    qty_ordered     integer NOT NULL DEFAULT 0,
    qty_received    integer NOT NULL DEFAULT 0,
    unit_cost_rm    numeric DEFAULT 0,
    line_total_rm   numeric DEFAULT 0,
    notes           text,
    created_at      timestamptz NOT NULL DEFAULT now(),
    version         integer NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_po_items_po_id  ON public.purchase_order_items(po_id);
CREATE INDEX IF NOT EXISTS idx_po_items_sku    ON public.purchase_order_items(sku);
CREATE INDEX IF NOT EXISTS idx_po_status       ON public.purchase_orders(status);
CREATE INDEX IF NOT EXISTS idx_po_supplier     ON public.purchase_orders(supplier_id);

-- =================================================================
-- S2.3 INVENTORY_BATCHES — capture cost per batch + PO link
-- =================================================================
ALTER TABLE public.inventory_batches
    ADD COLUMN IF NOT EXISTS cost_price       numeric,
    ADD COLUMN IF NOT EXISTS landed_cost      numeric,    -- cost + freight + duty per unit
    ADD COLUMN IF NOT EXISTS po_number        text,
    ADD COLUMN IF NOT EXISTS supplier_name    text,
    ADD COLUMN IF NOT EXISTS notes            text;

CREATE INDEX IF NOT EXISTS idx_batches_po ON public.inventory_batches(po_number);

-- =================================================================
-- S2.5 PRODUCTS_MASTER — per-SKU reorder policy + supplier link
-- =================================================================
ALTER TABLE public.products_master
    ADD COLUMN IF NOT EXISTS reorder_point    integer DEFAULT 10,
    ADD COLUMN IF NOT EXISTS reorder_qty      integer,
    ADD COLUMN IF NOT EXISTS lead_time_days   integer,
    ADD COLUMN IF NOT EXISTS preferred_supplier_id bigint REFERENCES public.suppliers(id);

-- Smart defaults: 5 unit reorder for low-volume, 20 for high-volume
UPDATE public.products_master SET reorder_point = 10 WHERE reorder_point IS NULL;
