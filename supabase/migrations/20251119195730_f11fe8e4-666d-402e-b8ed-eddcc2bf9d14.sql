-- Allow public access to read restaurant profiles (for public store page)
CREATE POLICY "Public can view restaurant profiles"
  ON public.profiles
  FOR SELECT
  USING (true);

-- Allow public access to view available products (for public store page)
-- This policy already exists but let's ensure it's working correctly
DROP POLICY IF EXISTS "Anyone can view available products" ON public.products;

CREATE POLICY "Anyone can view available products"
  ON public.products
  FOR SELECT
  USING (available = true);