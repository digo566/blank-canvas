-- Fix the overly permissive SELECT policy for product_categories
-- Replace USING (true) with a more restrictive check

DROP POLICY IF EXISTS "Public can view categories for store" ON public.product_categories;

-- Public can only view categories that belong to existing restaurants (profiles)
CREATE POLICY "Public can view categories for store"
ON public.product_categories
FOR SELECT
TO anon
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.id = restaurant_id
  )
);