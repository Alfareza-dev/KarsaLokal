-- ============================================================
-- MIGRATION: Add profiles, inventory, orders tables
-- + store_configs columns (admin_wa_number, payment_mode)
-- Run this in Supabase SQL Editor
-- ============================================================

-- 1. Add new columns to store_configs
alter table store_configs
  add column if not exists admin_wa_number text,
  add column if not exists payment_mode text default 'manual';

-- 2. Create PROFILES table (1:1 with auth.users)
create table if not exists profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  full_name text,
  whatsapp_number text,
  role text default 'user' check (role in ('user', 'admin')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Create INVENTORY table (digital stock)
create table if not exists inventory (
  id serial primary key,
  product_id integer references products(id) on delete cascade not null,
  content_data text not null,
  is_sold boolean default false,
  sold_to uuid references auth.users(id) on delete set null,
  sold_at timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 4. Create ORDERS table (transactions)
create table if not exists orders (
  id serial primary key,
  user_id uuid references auth.users(id) on delete set null not null,
  product_id integer references products(id) on delete set null,
  amount integer not null,
  status text default 'pending' check (status in ('pending', 'settled', 'failed')),
  reference_id text unique,
  product_name text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 5. Enable RLS on new tables
alter table profiles enable row level security;
alter table inventory enable row level security;
alter table orders enable row level security;

-- 6. RLS Policies — PROFILES
create policy "Users can view own profile"
  on profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

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

create policy "Admin can manage all profiles"
  on profiles for all
  using ( is_admin() );

-- 7. RLS Policies — INVENTORY
create policy "Public can view inventory stock"
  on inventory for select
  using (true);

create policy "Admin can manage inventory"
  on inventory for all
  using (
    exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin')
  );

-- 8. RLS Policies — ORDERS
create policy "Users can view own orders"
  on orders for select
  using (auth.uid() = user_id);

create policy "Users can create own orders"
  on orders for insert
  with check (auth.uid() = user_id);

create policy "Admin can view all orders"
  on orders for select
  using (
    exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin')
  );

create policy "Admin can manage all orders"
  on orders for all
  using (
    exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin')
  );

-- 9. Triggers — auto-update updated_at on new tables
create trigger profiles_updated_at before update on profiles for each row execute procedure handle_updated_at();
create trigger inventory_updated_at before update on inventory for each row execute procedure handle_updated_at();
create trigger orders_updated_at before update on orders for each row execute procedure handle_updated_at();

-- 10. Trigger — Auto-create profile row when a new user signs up
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

-- Drop trigger if exists, then create
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- ============================================================
-- DONE! Verify with:
-- SELECT * FROM profiles LIMIT 5;
-- SELECT * FROM inventory LIMIT 5;
-- SELECT * FROM orders LIMIT 5;
-- SELECT admin_wa_number, payment_mode FROM store_configs;
-- ============================================================
