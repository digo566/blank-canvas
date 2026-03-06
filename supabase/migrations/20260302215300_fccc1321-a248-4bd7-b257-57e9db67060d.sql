
-- Function to check if a restaurant has an active subscription (public access)
CREATE OR REPLACE FUNCTION public.check_restaurant_subscription(restaurant_id_param uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.subscriptions
    WHERE user_id = restaurant_id_param
      AND status = 'active'
  )
$$;
