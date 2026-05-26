-- ============================================================
-- MIGRATION: Custom Auth System
-- Extends profiles table for self-managed authentication.
-- Removes dependency on auth.users for login/session management.
-- ============================================================

-- 1. Drop foreign key constraint to auth.users
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;

-- 2. Set default UUID generation for new rows
ALTER TABLE profiles ALTER COLUMN id SET DEFAULT gen_random_uuid();

-- 3. Add custom auth columns
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS password_hash TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS otp_code TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS otp_expires_at TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS otp_cooldown_at TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;

-- 4. Add unique constraint on email (after populating if needed)
-- Run this AFTER ensuring no duplicate emails exist:
-- ALTER TABLE profiles ADD CONSTRAINT profiles_email_unique UNIQUE (email);
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profiles_email_unique'
  ) THEN
    ALTER TABLE profiles ADD CONSTRAINT profiles_email_unique UNIQUE (email);
  END IF;
END $$;

-- 5. Index for fast email lookups
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);

-- 6. Drop the old trigger that auto-creates profile from auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user();

-- 7. Update inventory foreign key (sold_to references profiles.id, not auth.users)
-- The column type is already UUID, so no change needed if profiles.id stays UUID.
-- Just ensure the FK is correct:
-- ALTER TABLE inventory DROP CONSTRAINT IF EXISTS inventory_sold_to_fkey;
-- ALTER TABLE inventory ADD CONSTRAINT inventory_sold_to_fkey
--   FOREIGN KEY (sold_to) REFERENCES profiles(id) ON DELETE SET NULL;

-- 8. Update orders foreign key similarly:
-- ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_user_id_fkey;
-- ALTER TABLE orders ADD CONSTRAINT orders_user_id_fkey
--   FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE SET NULL;

-- ============================================================
-- NOTE: Run the commented-out FK updates (7 & 8) after verifying
-- that all existing user_id/sold_to values exist in profiles.id.
-- ============================================================
