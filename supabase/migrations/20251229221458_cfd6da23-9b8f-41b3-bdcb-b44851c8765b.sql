-- Create a function to get public profile data (without sensitive phone)
CREATE OR REPLACE FUNCTION public.get_public_profile(profile_id uuid)
RETURNS TABLE (
  id uuid,
  restaurant_name text,
  opening_hours jsonb,
  logo_url text,
  cover_url text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    p.id,
    p.restaurant_name,
    p.opening_hours,
    p.logo_url,
    p.cover_url
  FROM public.profiles p
  WHERE p.id = profile_id;
$$;

-- Create a function to get public products (without cost_price and profit_margin)
CREATE OR REPLACE FUNCTION public.get_public_products(restaurant_id_param uuid)
RETURNS TABLE (
  id uuid,
  restaurant_id uuid,
  name text,
  description text,
  price numeric,
  image_url text,
  available boolean,
  created_at timestamptz,
  updated_at timestamptz
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

-- Add a column to profiles to allow owners to choose if phone is public
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS show_phone_publicly boolean DEFAULT true;

-- Create a function that returns phone only if owner opted to show it publicly
CREATE OR REPLACE FUNCTION public.get_public_profile_with_phone(profile_id uuid)
RETURNS TABLE (
  id uuid,
  restaurant_name text,
  phone text,
  opening_hours jsonb,
  logo_url text,
  cover_url text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    p.id,
    p.restaurant_name,
    CASE WHEN p.show_phone_publicly = true THEN p.phone ELSE NULL END as phone,
    p.opening_hours,
    p.logo_url,
    p.cover_url
  FROM public.profiles p
  WHERE p.id = profile_id;
$$;