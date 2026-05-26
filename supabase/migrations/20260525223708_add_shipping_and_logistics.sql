-- 1. Update `products` table
ALTER TABLE products 
  ADD COLUMN weight numeric DEFAULT 0,
  ADD COLUMN dimensions text,
  ADD COLUMN origin_village_code varchar(10);

-- 2. Create `user_addresses` table
CREATE TABLE IF NOT EXISTS user_addresses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_name text NOT NULL,
  phone_number text NOT NULL,
  full_address text NOT NULL,
  village_code varchar(10) NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id) -- Assuming 1 address per user for simplicity right now
);

-- RLS for user_addresses
ALTER TABLE user_addresses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own address" 
  ON user_addresses FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own address" 
  ON user_addresses FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own address" 
  ON user_addresses FOR UPDATE 
  USING (auth.uid() = user_id);

-- 3. Update `orders` table
ALTER TABLE orders 
  ADD COLUMN shipping_method varchar(20) DEFAULT 'delivery',
  ADD COLUMN shipping_cost numeric DEFAULT 0,
  ADD COLUMN courier_name text,
  ADD COLUMN courier_code text,
  ADD COLUMN shipping_status varchar(20) DEFAULT 'pending',
  ADD COLUMN tracking_number text;

-- 4. Update `store_configs` table with default origin village code
ALTER TABLE store_configs 
  ADD COLUMN default_village_code varchar(10);
