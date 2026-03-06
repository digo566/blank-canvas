-- Add delivery time columns to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS min_delivery_time integer DEFAULT 30,
ADD COLUMN IF NOT EXISTS max_delivery_time integer DEFAULT 60;

-- Update the get_public_profile_with_phone function to include delivery time and logo/cover
DROP FUNCTION IF EXISTS public.get_public_profile_with_phone(uuid);

CREATE OR REPLACE FUNCTION public.get_public_profile_with_phone(profile_id uuid)
RETURNS TABLE(
  id uuid, 
  restaurant_name text, 
  phone text, 
  opening_hours jsonb, 
  logo_url text, 
  cover_url text,
  min_delivery_time integer,
  max_delivery_time integer
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 
    p.id,
    p.restaurant_name,
    CASE WHEN p.show_phone_publicly = true THEN p.phone ELSE NULL END as phone,
    p.opening_hours,
    p.logo_url,
    p.cover_url,
    p.min_delivery_time,
    p.max_delivery_time
  FROM public.profiles p
  WHERE p.id = profile_id;
$$;