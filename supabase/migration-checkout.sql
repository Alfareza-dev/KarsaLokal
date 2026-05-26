-- ============================================================
-- MIGRATION: Checkout Flow & Order Enhancements
-- Run this in Supabase SQL Editor
-- ============================================================

-- 1. Add missing columns to orders table (if not already present)
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS payment_method text,
  ADD COLUMN IF NOT EXISTS louvin_transaction_id text,
  ADD COLUMN IF NOT EXISTS expired_at timestamptz,
  ADD COLUMN IF NOT EXISTS qr_string text,
  ADD COLUMN IF NOT EXISTS va_number text,
  ADD COLUMN IF NOT EXISTS bank text;

-- 2. Add 'cancelled' to the status CHECK constraint
-- First drop the existing constraint, then re-add with 'cancelled'
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE orders ADD CONSTRAINT orders_status_check
  CHECK (status IN ('pending', 'settled', 'failed', 'cancelled'));

-- 3. Add order_id column to inventory for linking settled orders
ALTER TABLE inventory
  ADD COLUMN IF NOT EXISTS order_id integer REFERENCES orders(id) ON DELETE SET NULL;

-- 4. Allow users to update their own orders (for cancel flow)
-- Check if policy already exists before creating
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'orders' AND policyname = 'Users can update own orders'
  ) THEN
    CREATE POLICY "Users can update own orders"
      ON orders FOR UPDATE
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END
$$;

-- 5. Allow users to read inventory for their settled orders
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'inventory' AND policyname = 'Users can view own purchased inventory'
  ) THEN
    CREATE POLICY "Users can view own purchased inventory"
      ON inventory FOR SELECT
      USING (
        sold_to = auth.uid()
        OR EXISTS (
          SELECT 1 FROM orders o
          WHERE o.id = inventory.order_id
          AND o.user_id = auth.uid()
          AND o.status = 'settled'
        )
      );
  END IF;
END
$$;

-- ============================================================
-- DONE! Verify with:
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'orders';
-- SELECT * FROM orders WHERE status = 'cancelled' LIMIT 5;
-- ============================================================
