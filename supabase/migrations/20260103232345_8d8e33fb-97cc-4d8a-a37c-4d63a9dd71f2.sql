-- Drop and recreate the functions with new return type
DROP FUNCTION IF EXISTS public.get_public_products(uuid);
DROP FUNCTION IF EXISTS public.get_public_products_safe(uuid);

-- Recreate get_public_products with category_id
CREATE FUNCTION public.get_public_products(restaurant_id_param uuid)
 RETURNS TABLE(id uuid, restaurant_id uuid, name text, description text, price numeric, image_url text, available boolean, category_id uuid, created_at timestamp with time zone, updated_at timestamp with time zone)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT 
    p.id,
    p.restaurant_id,
    p.name,
    p.description,
    p.price,
    p.image_url,
    p.available,
    p.category_id,
    p.created_at,
    p.updated_at
  FROM public.products p
  WHERE p.restaurant_id = restaurant_id_param
    AND p.available = true
  ORDER BY p.created_at DESC;
$function$;

-- Recreate get_public_products_safe with category_id
CREATE FUNCTION public.get_public_products_safe(restaurant_id_param uuid)
 RETURNS TABLE(id uuid, restaurant_id uuid, name text, description text, price numeric, image_url text, available boolean, category_id uuid, created_at timestamp with time zone, updated_at timestamp with time zone)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT 
    p.id,
    p.restaurant_id,
    p.name,
    p.description,
    p.price,
    p.image_url,
    p.available,
    p.category_id,
    p.created_at,
    p.updated_at
  FROM public.products p
  WHERE p.restaurant_id = restaurant_id_param
    AND p.available = true
  ORDER BY p.created_at DESC;
$function$;