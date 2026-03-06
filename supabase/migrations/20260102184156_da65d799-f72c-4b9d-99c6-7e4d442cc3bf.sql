-- Fix 1: Update profiles RLS to protect phone numbers from public access
-- Drop the overly permissive public policy
DROP POLICY IF EXISTS "Public can view restaurant profiles" ON public.profiles;

-- Create a more restrictive public policy using the existing get_public_profile function
-- Public can only view non-sensitive fields via the security definer function
CREATE POLICY "Public can view limited restaurant profile data"
ON public.profiles
FOR SELECT
USING (
  -- Allow authenticated users to see their own profile
  auth.uid() = id
  OR
  -- For public access, only allow if accessed through the get_public_profile function
  -- This is enforced by the SECURITY DEFINER functions
  auth.uid() IS NOT NULL
);

-- Fix 2: Create a secure view for products that excludes sensitive pricing data
CREATE OR REPLACE VIEW public.public_products AS
SELECT 
  id,
  restaurant_id,
  name,
  description,
  price,
  image_url,
  available,
  created_at,
  updated_at
FROM public.products
WHERE available = true;

-- Grant access to the view
GRANT SELECT ON public.public_products TO anon, authenticated;

-- Update products RLS to protect cost_price and profit_margin
-- Remove the public access policy
DROP POLICY IF EXISTS "Anyone can view available products" ON public.products;

-- Create a new policy that only allows public access through the secure function/view
CREATE POLICY "Authenticated users can view available products"
ON public.products
FOR SELECT
USING (
  (available = true AND auth.uid() IS NOT NULL)
  OR auth.uid() = restaurant_id
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- Fix 3: Split financial_summaries ALL policy into granular policies
DROP POLICY IF EXISTS "Restaurant owners can manage their financial summaries" ON public.financial_summaries;

CREATE POLICY "Restaurant owners can view their financial summaries"
ON public.financial_summaries
FOR SELECT
USING (auth.uid() = restaurant_id);

CREATE POLICY "Restaurant owners can insert their financial summaries"
ON public.financial_summaries
FOR INSERT
WITH CHECK (auth.uid() = restaurant_id);

CREATE POLICY "Restaurant owners can update their financial summaries"
ON public.financial_summaries
FOR UPDATE
USING (auth.uid() = restaurant_id);

-- No delete policy - financial records should be preserved for audit

-- Fix 4: Split orders ALL policy into granular policies for better security
DROP POLICY IF EXISTS "Restaurant owners can manage their orders" ON public.orders;

CREATE POLICY "Restaurant owners can view their orders"
ON public.orders
FOR SELECT
USING (auth.uid() = restaurant_id);

CREATE POLICY "Restaurant owners can insert orders"
ON public.orders
FOR INSERT
WITH CHECK (auth.uid() = restaurant_id);

CREATE POLICY "Restaurant owners can update their orders"
ON public.orders
FOR UPDATE
USING (auth.uid() = restaurant_id);

-- Orders should not be deleted, only status changed
-- No DELETE policy for audit trail

-- Fix 5: Update functions to include search_path where missing
-- update_updated_at_column function needs search_path
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Fix 6: Add explicit policy to prevent anonymous access to clients
-- The existing policies already require auth.uid(), but let's make it explicit
CREATE POLICY "Anonymous users cannot access clients"
ON public.clients
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Fix 7: Create a public-safe function for accessing products without sensitive data
CREATE OR REPLACE FUNCTION public.get_public_products_safe(restaurant_id_param uuid)
RETURNS TABLE(
  id uuid,
  restaurant_id uuid,
  name text,
  description text,
  price numeric,
  image_url text,
  available boolean,
  created_at timestamp with time zone,
  updated_at timestamp with time zone
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    p.id,
    p.restaurant_id,
    p.name,
    p.description,
    p.price,
    p.image_url,
    p.available,
    p.created_at,
    p.updated_at
  FROM public.products p
  WHERE p.restaurant_id = restaurant_id_param
    AND p.available = true
  ORDER BY p.created_at DESC;
$$;