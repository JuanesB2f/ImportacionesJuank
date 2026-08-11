-- ImportacionesJuank PIM — schema alineado a Shopify
-- Producto = 1 REFERENCIA | Variante = COLOR + TALLA (+ stock/precio)

create extension if not exists "pgcrypto";

create type product_status as enum ('active', 'draft', 'archived');

-- ── Producto (nivel Shopify Product) ─────────────────────────────────────────
create table products (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique,          -- REFERENCIA proveedor (SK001)
  handle text not null unique,             -- Shopify Handle (sk001)
  title text not null,
  body_html text,
  vendor text default 'ImportacionesJuank',
  product_type text,
  tags text[] default '{}',
  status product_status not null default 'draft',
  seo_title text,
  seo_description text,
  option1_name text not null default 'Color',
  option2_name text not null default 'Talla',
  option3_name text,
  shopify_product_id text,                 -- gid futuro vía Admin API
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index products_status_idx on products (status);
create index products_vendor_idx on products (vendor);

-- ── Variante (nivel Shopify Variant) ─────────────────────────────────────────
create table variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products (id) on delete cascade,
  sku text not null unique,                -- SK001-AZUL-HIELO-8
  barcode text,
  option1_value text not null,             -- COLOR
  option2_value text not null,             -- TALLA
  option3_value text,
  cost numeric(12, 2) default 0,
  price_retail numeric(12, 2) not null default 0,       -- → Variant Price (Shopify)
  price_entrepreneur numeric(12, 2) default 0,          -- interno (no va a Shopify)
  price_wholesale numeric(12, 2) default 0,             -- interno
  price_distributor numeric(12, 2) default 0,           -- interno
  grams integer not null default 0,
  inventory_qty integer not null default 0 check (inventory_qty >= 0),
  inventory_policy text not null default 'deny',        -- deny | continue
  fulfillment_service text not null default 'manual',
  requires_shipping boolean not null default true,
  taxable boolean not null default true,
  shopify_variant_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (product_id, option1_value, option2_value, option3_value)
);

create index variants_product_id_idx on variants (product_id);
create index variants_option_idx on variants (option1_value, option2_value);

-- ── Imágenes ─────────────────────────────────────────────────────────────────
create table product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products (id) on delete cascade,
  variant_id uuid references variants (id) on delete set null,
  storage_path text,                       -- path en Supabase Storage
  public_url text,                         -- Image Src / Variant Image
  alt_text text,
  position integer not null default 1,
  is_primary boolean not null default false,
  created_at timestamptz not null default now()
);

create index product_images_product_id_idx on product_images (product_id);

-- ── Inventario extendido (reservas, mínimos) ─────────────────────────────────
create table inventory_levels (
  id uuid primary key default gen_random_uuid(),
  variant_id uuid not null unique references variants (id) on delete cascade,
  location text not null default 'principal',
  available integer not null default 0,
  reserved integer not null default 0,
  min_stock integer not null default 0,
  max_stock integer,
  updated_at timestamptz not null default now()
);

-- ── updated_at automático ────────────────────────────────────────────────────
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger products_updated_at
  before update on products
  for each row execute function set_updated_at();

create trigger variants_updated_at
  before update on variants
  for each row execute function set_updated_at();
