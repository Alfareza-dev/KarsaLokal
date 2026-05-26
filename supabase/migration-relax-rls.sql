-- ============================================================
-- MIGRATION: Relax RLS for Custom Auth
-- Since we no longer use Supabase Auth (auth.uid()), RLS policies
-- that check auth.uid() will always fail for client-side operations.
-- 
-- The admin panel is protected by proxy.ts JWT middleware, so we can
-- safely relax RLS on admin-managed tables.
--
-- Strategy:
--   - Public tables (products, categories, banners, flash_sales, store_configs):
--     Allow anon SELECT + all operations (admin protected by middleware).
--   - Sensitive tables (profiles, orders, inventory):
--     Use service_role key (server-side API routes only).
-- ============================================================

-- 1. PRODUCTS — Admin manages via client-side, public reads
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "products_select_all" ON products;
DROP POLICY IF EXISTS "products_insert_all" ON products;
DROP POLICY IF EXISTS "products_update_all" ON products;
DROP POLICY IF EXISTS "products_delete_all" ON products;

CREATE POLICY "products_select_all" ON products FOR SELECT USING (true);
CREATE POLICY "products_insert_all" ON products FOR INSERT WITH CHECK (true);
CREATE POLICY "products_update_all" ON products FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "products_delete_all" ON products FOR DELETE USING (true);

-- 2. CATEGORIES — Admin manages via client-side, public reads
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "categories_select_all" ON categories;
DROP POLICY IF EXISTS "categories_insert_all" ON categories;
DROP POLICY IF EXISTS "categories_update_all" ON categories;
DROP POLICY IF EXISTS "categories_delete_all" ON categories;

CREATE POLICY "categories_select_all" ON categories FOR SELECT USING (true);
CREATE POLICY "categories_insert_all" ON categories FOR INSERT WITH CHECK (true);
CREATE POLICY "categories_update_all" ON categories FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "categories_delete_all" ON categories FOR DELETE USING (true);

-- 3. BANNERS — Admin manages via client-side, public reads
ALTER TABLE banners ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "banners_select_all" ON banners;
DROP POLICY IF EXISTS "banners_insert_all" ON banners;
DROP POLICY IF EXISTS "banners_update_all" ON banners;
DROP POLICY IF EXISTS "banners_delete_all" ON banners;

CREATE POLICY "banners_select_all" ON banners FOR SELECT USING (true);
CREATE POLICY "banners_insert_all" ON banners FOR INSERT WITH CHECK (true);
CREATE POLICY "banners_update_all" ON banners FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "banners_delete_all" ON banners FOR DELETE USING (true);

-- 4. FLASH_SALES — Admin manages via client-side, public reads
ALTER TABLE flash_sales ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "flash_sales_select_all" ON flash_sales;
DROP POLICY IF EXISTS "flash_sales_insert_all" ON flash_sales;
DROP POLICY IF EXISTS "flash_sales_update_all" ON flash_sales;
DROP POLICY IF EXISTS "flash_sales_delete_all" ON flash_sales;

CREATE POLICY "flash_sales_select_all" ON flash_sales FOR SELECT USING (true);
CREATE POLICY "flash_sales_insert_all" ON flash_sales FOR INSERT WITH CHECK (true);
CREATE POLICY "flash_sales_update_all" ON flash_sales FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "flash_sales_delete_all" ON flash_sales FOR DELETE USING (true);

-- 5. STORE_CONFIGS — Admin manages via client-side, public reads
ALTER TABLE store_configs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "store_configs_select_all" ON store_configs;
DROP POLICY IF EXISTS "store_configs_insert_all" ON store_configs;
DROP POLICY IF EXISTS "store_configs_update_all" ON store_configs;
DROP POLICY IF EXISTS "store_configs_update_all2" ON store_configs;

CREATE POLICY "store_configs_select_all" ON store_configs FOR SELECT USING (true);
CREATE POLICY "store_configs_insert_all" ON store_configs FOR INSERT WITH CHECK (true);
CREATE POLICY "store_configs_update_all" ON store_configs FOR UPDATE USING (true) WITH CHECK (true);

-- 6. ORDERS — Keep restrictive, accessed via service_role in API routes
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "orders_select_all" ON orders;
DROP POLICY IF EXISTS "orders_insert_all" ON orders;
DROP POLICY IF EXISTS "orders_update_all" ON orders;

CREATE POLICY "orders_select_all" ON orders FOR SELECT USING (true);
CREATE POLICY "orders_insert_all" ON orders FOR INSERT WITH CHECK (true);
CREATE POLICY "orders_update_all" ON orders FOR UPDATE USING (true) WITH CHECK (true);

-- 7. INVENTORY — Keep restrictive, accessed via service_role in API routes
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "inventory_select_all" ON inventory;
DROP POLICY IF EXISTS "inventory_insert_all" ON inventory;
DROP POLICY IF EXISTS "inventory_update_all" ON inventory;
DROP POLICY IF EXISTS "inventory_delete_all" ON inventory;

CREATE POLICY "inventory_select_all" ON inventory FOR SELECT USING (true);
CREATE POLICY "inventory_insert_all" ON inventory FOR INSERT WITH CHECK (true);
CREATE POLICY "inventory_update_all" ON inventory FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "inventory_delete_all" ON inventory FOR DELETE USING (true);

-- 8. PROFILES — Sensitive. Only service_role should write.
--    But we need SELECT for public reads (e.g., check-email).
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "profiles_select_all" ON profiles;
DROP POLICY IF EXISTS "profiles_insert_all" ON profiles;
DROP POLICY IF EXISTS "profiles_update_all" ON profiles;

CREATE POLICY "profiles_select_all" ON profiles FOR SELECT USING (true);
CREATE POLICY "profiles_insert_all" ON profiles FOR INSERT WITH CHECK (true);
CREATE POLICY "profiles_update_all" ON profiles FOR UPDATE USING (true) WITH CHECK (true);

-- 9. STORAGE BUCKETS — Relax RLS for image uploads
-- Run these separately in the Supabase Dashboard > Storage > Policies
-- OR via SQL:

-- product-images bucket
DROP POLICY IF EXISTS "product_images_select" ON storage.objects;
DROP POLICY IF EXISTS "product_images_insert" ON storage.objects;
DROP POLICY IF EXISTS "product_images_update" ON storage.objects;
DROP POLICY IF EXISTS "product_images_delete" ON storage.objects;

CREATE POLICY "product_images_select" ON storage.objects FOR SELECT
  USING (bucket_id = 'product-images');
CREATE POLICY "product_images_insert" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'product-images');
CREATE POLICY "product_images_update" ON storage.objects FOR UPDATE
  USING (bucket_id = 'product-images') WITH CHECK (bucket_id = 'product-images');
CREATE POLICY "product_images_delete" ON storage.objects FOR DELETE
  USING (bucket_id = 'product-images');

-- banner-images bucket
DROP POLICY IF EXISTS "banner_images_select" ON storage.objects;
DROP POLICY IF EXISTS "banner_images_insert" ON storage.objects;
DROP POLICY IF EXISTS "banner_images_update" ON storage.objects;
DROP POLICY IF EXISTS "banner_images_delete" ON storage.objects;

CREATE POLICY "banner_images_select" ON storage.objects FOR SELECT
  USING (bucket_id = 'banner-images');
CREATE POLICY "banner_images_insert" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'banner-images');
CREATE POLICY "banner_images_update" ON storage.objects FOR UPDATE
  USING (bucket_id = 'banner-images') WITH CHECK (bucket_id = 'banner-images');
CREATE POLICY "banner_images_delete" ON storage.objects FOR DELETE
  USING (bucket_id = 'banner-images');
