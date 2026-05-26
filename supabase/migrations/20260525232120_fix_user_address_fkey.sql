-- Drop the incorrect foreign key referencing auth.users (if it exists)
ALTER TABLE public.user_addresses
  DROP CONSTRAINT IF EXISTS user_addresses_user_id_fkey;

-- Add the correct foreign key referencing public.profiles
ALTER TABLE public.user_addresses
  ADD CONSTRAINT user_addresses_user_id_fkey 
  FOREIGN KEY (user_id) 
  REFERENCES public.profiles(id) 
  ON DELETE CASCADE;
