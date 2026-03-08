
-- Fix: allow anonymous users to view categories for public stores
-- The old policy referenced profiles table which has restrictive RLS
DROP POLICY IF EXISTS "Public can view categories for store" ON public.product_categories;

CREATE POLICY "Public can view categories for store"
ON public.product_categories
FOR SELECT
TO anon, authenticated
USING (true);
