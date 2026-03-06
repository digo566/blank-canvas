-- Fix search path for set_tracking_code_on_insert
ALTER FUNCTION public.set_tracking_code_on_insert() SET search_path = public;