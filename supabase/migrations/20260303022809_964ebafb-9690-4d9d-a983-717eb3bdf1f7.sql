
-- Add trial_ends_at to profiles for 7-day free trial
ALTER TABLE public.profiles ADD COLUMN trial_ends_at timestamp with time zone DEFAULT (now() + interval '7 days');

-- Update handle_new_user to set trial_ends_at
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, restaurant_name, phone, trial_ends_at)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'restaurant_name', 'Meu Restaurante'),
    COALESCE(NEW.raw_user_meta_data->>'phone', ''),
    now() + interval '7 days'
  );
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'restaurant');
  
  RETURN NEW;
END;
$function$;
