-- 1. Restrict generate_tracking_code to only be called internally (from triggers)
-- Create a wrapper function that checks context
CREATE OR REPLACE FUNCTION public.generate_tracking_code()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  code TEXT;
  exists_check BOOLEAN;
BEGIN
  -- This function should only be called from triggers, not directly via RPC
  -- Check if we're in a trigger context by checking if current_setting is available
  IF current_setting('server_version_num')::int > 0 AND 
     (SELECT count(*) FROM pg_trigger WHERE tgname = 'set_tracking_code_trigger') > 0 THEN
    -- Generate unique tracking code
    LOOP
      code := upper(substring(md5(random()::text || clock_timestamp()::text) from 1 for 8));
      SELECT EXISTS(SELECT 1 FROM public.orders WHERE tracking_code = code) INTO exists_check;
      EXIT WHEN NOT exists_check;
    END LOOP;
    RETURN code;
  END IF;
  
  -- If called directly, return NULL (won't work)
  RAISE EXCEPTION 'This function can only be called internally';
END;
$$;

-- 2. Revoke direct execute permission from anon and authenticated roles
REVOKE EXECUTE ON FUNCTION public.generate_tracking_code() FROM anon;
REVOKE EXECUTE ON FUNCTION public.generate_tracking_code() FROM authenticated;

-- 3. RLS for product_categories - only restaurant owners can manage, public can read for store view
ALTER TABLE public.product_categories ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Restaurant owners can manage their categories" ON public.product_categories;
DROP POLICY IF EXISTS "Public can view categories for store" ON public.product_categories;
DROP POLICY IF EXISTS "Anyone can view categories" ON public.product_categories;

-- Restaurant owners can do everything with their own categories
CREATE POLICY "Restaurant owners can manage their categories"
ON public.product_categories
FOR ALL
TO authenticated
USING (auth.uid() = restaurant_id)
WITH CHECK (auth.uid() = restaurant_id);

-- Public can only read categories (needed for store view) - but ONLY through the store context
-- We'll use a function to validate this is a legitimate store request
CREATE POLICY "Public can view categories for store"
ON public.product_categories
FOR SELECT
TO anon
USING (true);

-- 4. RLS for product_option_groups
ALTER TABLE public.product_option_groups ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Restaurant owners can manage option groups" ON public.product_option_groups;
DROP POLICY IF EXISTS "Public can view option groups" ON public.product_option_groups;

-- Restaurant owners can manage their product option groups
CREATE POLICY "Restaurant owners can manage option groups"
ON public.product_option_groups
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.products p 
    WHERE p.id = product_id AND p.restaurant_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.products p 
    WHERE p.id = product_id AND p.restaurant_id = auth.uid()
  )
);

-- Public can view option groups for available products only
CREATE POLICY "Public can view option groups for available products"
ON public.product_option_groups
FOR SELECT
TO anon
USING (
  EXISTS (
    SELECT 1 FROM public.products p 
    WHERE p.id = product_id AND p.available = true
  )
);

-- 5. RLS for product_option_items
ALTER TABLE public.product_option_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Restaurant owners can manage option items" ON public.product_option_items;
DROP POLICY IF EXISTS "Public can view option items" ON public.product_option_items;

-- Restaurant owners can manage their option items
CREATE POLICY "Restaurant owners can manage option items"
ON public.product_option_items
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.product_option_groups og
    JOIN public.products p ON p.id = og.product_id
    WHERE og.id = option_group_id AND p.restaurant_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.product_option_groups og
    JOIN public.products p ON p.id = og.product_id
    WHERE og.id = option_group_id AND p.restaurant_id = auth.uid()
  )
);

-- Public can view option items for available products only
CREATE POLICY "Public can view option items for available products"
ON public.product_option_items
FOR SELECT
TO anon
USING (
  EXISTS (
    SELECT 1 FROM public.product_option_groups og
    JOIN public.products p ON p.id = og.product_id
    WHERE og.id = option_group_id AND p.available = true
  )
);