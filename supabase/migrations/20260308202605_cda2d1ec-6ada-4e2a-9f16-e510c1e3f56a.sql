
CREATE OR REPLACE FUNCTION public.get_order_by_tracking_code(tracking_code_param text)
RETURNS TABLE(
  id uuid,
  tracking_code text,
  status text,
  total_amount numeric,
  created_at timestamptz,
  preparation_started_at timestamptz,
  ready_at timestamptz,
  delivered_at timestamptz,
  notes text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT 
    o.id,
    o.tracking_code,
    o.status::text,
    o.total_amount,
    o.created_at,
    o.preparation_started_at,
    o.ready_at,
    o.delivered_at,
    o.notes
  FROM public.orders o
  WHERE o.tracking_code = upper(tracking_code_param)
  AND o.tracking_code IS NOT NULL
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.get_order_items_by_order_id(order_id_param uuid)
RETURNS TABLE(
  quantity integer,
  product_name text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT 
    oi.quantity,
    p.name as product_name
  FROM public.order_items oi
  JOIN public.products p ON p.id = oi.product_id
  WHERE oi.order_id = order_id_param;
$$;
