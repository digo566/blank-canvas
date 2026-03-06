-- Fix security warning: Add search_path to the function
DROP TRIGGER IF EXISTS order_status_timestamp_trigger ON orders;
DROP FUNCTION IF EXISTS update_order_timestamps();

CREATE OR REPLACE FUNCTION update_order_timestamps()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'preparing' AND OLD.status = 'pending' THEN
    NEW.preparation_started_at = NOW();
  ELSIF NEW.status = 'ready' AND OLD.status = 'preparing' THEN
    NEW.ready_at = NOW();
  ELSIF NEW.status = 'delivered' AND OLD.status = 'ready' THEN
    NEW.delivered_at = NOW();
  END IF;
  RETURN NEW;
END;
$$;

-- Recreate the trigger
CREATE TRIGGER order_status_timestamp_trigger
BEFORE UPDATE ON orders
FOR EACH ROW
EXECUTE FUNCTION update_order_timestamps();