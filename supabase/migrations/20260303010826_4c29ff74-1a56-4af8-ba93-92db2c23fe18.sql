
-- Remove overly permissive "Anyone can view" policies that leak ALL data to anon users
DROP POLICY IF EXISTS "Anyone can view product categories" ON public.product_categories;
DROP POLICY IF EXISTS "Anyone can view product option groups" ON public.product_option_groups;
DROP POLICY IF EXISTS "Anyone can view product option items" ON public.product_option_items;

-- Revoke execute on generate_tracking_code from anon and authenticated (belt and suspenders)
REVOKE EXECUTE ON FUNCTION public.generate_tracking_code() FROM anon;
REVOKE EXECUTE ON FUNCTION public.generate_tracking_code() FROM authenticated;
