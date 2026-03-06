
CREATE OR REPLACE FUNCTION public.check_restaurant_subscription(restaurant_id_param uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.subscriptions
    WHERE user_id = restaurant_id_param
      AND status = 'active'
  )
  OR
  EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = restaurant_id_param
      AND trial_ends_at IS NOT NULL
      AND trial_ends_at > now()
  )
  OR
  EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = restaurant_id_param
      AND role = 'admin'
  )
$$;
