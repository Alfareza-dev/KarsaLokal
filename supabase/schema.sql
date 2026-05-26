-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. STORE CONFIG
create table store_configs (
  id integer primary key default 1,
  name text not null,
  tagline text,
  operational_hours text,
  popup_title text,
  popup_message text,
  popup_store_hours text,
  popup_extra_info text,
  popup_image_url text,
  is_popup_active boolean default true,
  contact_whatsapp text,
  contact_telegram text,
  contact_instagram text,
  theme_color text default '#F472B6',
  brand_emoji text default '✨',
  admin_wa_number text,
  payment_mode text default 'manual',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  constraint single_row check (id = 1)
);

-- 2. CATEGORIES
create table categories (
  id text primary key,
  name text not null,
  emoji text,
  order_index integer default 0,
  is_active boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. PRODUCTS
create table products (
  id serial primary key,
  slug text unique not null,
  name text not null,
  normal_price integer not null,
  current_price integer not null,
  category_id text references categories(id) on delete set null,
  badge text,
  status text check (status in ('ready', 'limited', 'habis')) default 'ready',
  description text,
  features jsonb default '[]'::jsonb, -- array of strings
  faq jsonb default '[]'::jsonb, -- array of objects {question, answer}
  gradient_from text,
  gradient_to text,
  image_url text,
  emoji text,
  is_active boolean default true,
  views integer default 0,
  clicks integer default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 4. BANNERS
create table banners (
  id serial primary key,
  title text,
  subtitle text,
  image_url text not null,
  order_index integer default 0,
  is_active boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 5. FLASH SALES
create table flash_sales (
  id serial primary key,
  product_id integer references products(id) on delete cascade not null,
  sale_price integer not null,
  start_at timestamp with time zone not null,
  end_at timestamp with time zone not null,
  is_active boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 6. PROFILES (1:1 with auth.users)
create table profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  full_name text,
  whatsapp_number text,
  role text default 'user' check (role in ('user', 'admin')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 7. INVENTORY (digital stock per product)
create table inventory (
  id serial primary key,
  product_id integer references products(id) on delete cascade not null,
  content_data text not null,
  is_sold boolean default false,
  sold_to uuid references auth.users(id) on delete set null,
  sold_at timestamp with time zone,
  order_id integer references orders(id) on delete set null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Performance indexes for inventory stock counting
create index idx_inventory_product_sold on inventory(product_id, is_sold);
create index idx_inventory_product_id on inventory(product_id);

-- 8. ORDERS (purchase transactions)
create table orders (
  id serial primary key,
  user_id uuid references auth.users(id) on delete set null not null,
  product_id integer references products(id) on delete set null,
  amount integer not null,
  status text default 'pending' check (status in ('pending', 'settled', 'failed')),
  reference_id text unique,
  product_name text, -- denormalized for history display
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- ============================================================
-- RLS Policies
-- ============================================================

-- Enable Row Level Security
alter table store_configs enable row level security;
alter table categories enable row level security;
alter table products enable row level security;
alter table banners enable row level security;
alter table flash_sales enable row level security;
alter table profiles enable row level security;
alter table inventory enable row level security;
alter table orders enable row level security;

-- Public can read active data
create policy "Public can view store configs" on store_configs for select using (true);
create policy "Public can view active categories" on categories for select using (is_active = true);
create policy "Public can view active products" on products for select using (is_active = true);
create policy "Public can view active banners" on banners for select using (is_active = true);
create policy "Public can view active flash sales" on flash_sales for select using (is_active = true);

-- Profiles: user can read/update own profile
create policy "Users can view own profile"
  on profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Profiles: admin can view all profiles
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

create policy "Admin can view all profiles"
  on profiles for select
  using ( is_admin() );

-- Profiles: admin can manage all profiles
create policy "Admin can manage all profiles"
  on profiles for all
  using ( is_admin() );

-- Inventory: public can check stock (read only)
create policy "Public can view inventory stock"
  on inventory for select
  using (true);

-- Inventory: admin can manage inventory
create policy "Admin can manage inventory"
  on inventory for all
  using (
    exists (
      select 1 from profiles p where p.id = auth.uid() and p.role = 'admin'
    )
  );

-- Orders: user can view own orders
create policy "Users can view own orders"
  on orders for select
  using (auth.uid() = user_id);

-- Orders: user can insert own orders
create policy "Users can create own orders"
  on orders for insert
  with check (auth.uid() = user_id);

-- Orders: admin can view all orders
create policy "Admin can view all orders"
  on orders for select
  using (
    exists (
      select 1 from profiles p where p.id = auth.uid() and p.role = 'admin'
    )
  );

-- Orders: admin can manage all orders
create policy "Admin can manage all orders"
  on orders for all
  using (
    exists (
      select 1 from profiles p where p.id = auth.uid() and p.role = 'admin'
    )
  );

-- Storage bucket creation (run in Supabase UI or using storage-api)
-- Bucket 1: images  → Store config / popup hero image
insert into storage.buckets (id, name, public) values ('images', 'images', true) on conflict do nothing;
create policy "Public Access images" on storage.objects for select using ( bucket_id = 'images' );
create policy "Auth Insert images" on storage.objects for insert with check ( bucket_id = 'images' and auth.role() = 'authenticated' );
create policy "Auth Update images" on storage.objects for update using ( bucket_id = 'images' and auth.role() = 'authenticated' );
create policy "Auth Delete images" on storage.objects for delete using ( bucket_id = 'images' and auth.role() = 'authenticated' );

-- Bucket 2: product-images → Product photos
insert into storage.buckets (id, name, public) values ('product-images', 'product-images', true) on conflict do nothing;
create policy "Public Access product-images" on storage.objects for select using ( bucket_id = 'product-images' );
create policy "Auth Insert product-images" on storage.objects for insert with check ( bucket_id = 'product-images' and auth.role() = 'authenticated' );
create policy "Auth Update product-images" on storage.objects for update using ( bucket_id = 'product-images' and auth.role() = 'authenticated' );
create policy "Auth Delete product-images" on storage.objects for delete using ( bucket_id = 'product-images' and auth.role() = 'authenticated' );

-- Bucket 3: banner-images → Promo banner photos
insert into storage.buckets (id, name, public) values ('banner-images', 'banner-images', true) on conflict do nothing;
create policy "Public Access banner-images" on storage.objects for select using ( bucket_id = 'banner-images' );
create policy "Auth Insert banner-images" on storage.objects for insert with check ( bucket_id = 'banner-images' and auth.role() = 'authenticated' );
create policy "Auth Update banner-images" on storage.objects for update using ( bucket_id = 'banner-images' and auth.role() = 'authenticated' );
create policy "Auth Delete banner-images" on storage.objects for delete using ( bucket_id = 'banner-images' and auth.role() = 'authenticated' );

-- ============================================================
-- TRIGGERS — Auto-update updated_at
-- ============================================================

create or replace function handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger store_configs_updated_at before update on store_configs for each row execute procedure handle_updated_at();
create trigger categories_updated_at before update on categories for each row execute procedure handle_updated_at();
create trigger products_updated_at before update on products for each row execute procedure handle_updated_at();
create trigger banners_updated_at before update on banners for each row execute procedure handle_updated_at();
create trigger flash_sales_updated_at before update on flash_sales for each row execute procedure handle_updated_at();
create trigger profiles_updated_at before update on profiles for each row execute procedure handle_updated_at();
create trigger inventory_updated_at before update on inventory for each row execute procedure handle_updated_at();
create trigger orders_updated_at before update on orders for each row execute procedure handle_updated_at();

-- ============================================================
-- TRIGGER — Auto-create profile on user signup
-- ============================================================

create or replace function handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', '')
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- ============================================================
-- RPC Functions
-- ============================================================

-- RPC: Atomically increment view_count for a product
create or replace function increment_view_count(row_id integer)
returns void as $$
begin
  update products set views = views + 1 where id = row_id;
end;
$$ language plpgsql security definer;

-- RPC: Atomically increment clicks (order_click_count) for a product
create or replace function increment_order_click_count(row_id integer)
returns void as $$
begin
  update products set clicks = clicks + 1 where id = row_id;
end;
$$ language plpgsql security definer;

-- ============================================================
-- ADMIN WRITE POLICIES (authenticated role)
-- These allow the admin dashboard to INSERT / UPDATE / DELETE.
-- Without these, mutations only work if RLS is fully disabled
-- which would expose write access to anonymous users.
-- ============================================================

-- store_configs
create policy "Admin manage store_configs"
  on store_configs for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- categories
create policy "Admin manage categories"
  on categories for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- products
create policy "Admin manage products"
  on products for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- banners
create policy "Admin manage banners"
  on banners for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- flash_sales
create policy "Admin manage flash_sales"
  on flash_sales for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');
