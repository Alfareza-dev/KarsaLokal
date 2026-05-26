-- Add stock to products
ALTER TABLE public.products
ADD COLUMN stock INTEGER NOT NULL DEFAULT 0;

-- Add address to store_configs
ALTER TABLE public.store_configs
ADD COLUMN address TEXT DEFAULT '';
