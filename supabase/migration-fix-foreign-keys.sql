-- ============================================================
-- MIGRATION: Fix Foreign Keys for Custom Auth
-- Run this in Supabase SQL Editor
--
-- Since we migrated from Supabase Auth to Custom Auth,
-- the foreign keys on 'orders' and 'inventory' tables that
-- refer to 'auth.users(id)' will violate constraints because
-- new users are inserted directly into 'public.profiles(id)'.
--
-- This migration updates these foreign keys to reference
-- 'public.profiles(id)' instead.
-- ============================================================

-- 1. Clean up orphaned records that do not exist in public.profiles
DELETE FROM orders WHERE user_id NOT IN (SELECT id FROM public.profiles);
UPDATE inventory SET sold_to = NULL WHERE sold_to NOT IN (SELECT id FROM public.profiles) AND sold_to IS NOT NULL;

-- 2. Update orders table foreign key
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_user_id_fkey;
ALTER TABLE orders ADD CONSTRAINT orders_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- 3. Update inventory table foreign key
ALTER TABLE inventory DROP CONSTRAINT IF EXISTS inventory_sold_to_fkey;
ALTER TABLE inventory ADD CONSTRAINT inventory_sold_to_fkey
  FOREIGN KEY (sold_to) REFERENCES public.profiles(id) ON DELETE SET NULL;
