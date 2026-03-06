-- Fix search_path for security on the new functions
CREATE OR REPLACE FUNCTION generate_tracking_code()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  code TEXT;
  exists BOOLEAN;
BEGIN
  LOOP
    code := upper(substring(md5(random()::text || clock_timestamp()::text) from 1 for 8));
    SELECT EXISTS(SELECT 1 FROM public.orders WHERE tracking_code = code) INTO exists;
    EXIT WHEN NOT exists;
  END LOOP;
  RETURN code;
END;
$$;

CREATE OR REPLACE FUNCTION set_tracking_code()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.tracking_code IS NULL THEN
    NEW.tracking_code := generate_tracking_code();
  END IF;
  RETURN NEW;
END;
$$;