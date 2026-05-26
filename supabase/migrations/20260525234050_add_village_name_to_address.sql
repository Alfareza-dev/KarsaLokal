ALTER TABLE public.user_addresses
  ADD COLUMN IF NOT EXISTS village_name text;
