-- ============================================================
-- MIGRATION: Add Quantity to Orders
-- Run this in Supabase SQL Editor
-- ============================================================

-- Add quantity column to orders table with a default value of 1
ALTER TABLE orders ADD COLUMN IF NOT EXISTS quantity integer NOT NULL DEFAULT 1;
