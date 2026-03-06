-- Allow public (anonymous/clients) to create orders
CREATE POLICY "Public can create orders"
ON public.orders
FOR INSERT
WITH CHECK (true);

-- Allow public to create order items
CREATE POLICY "Public can create order items"
ON public.order_items
FOR INSERT
WITH CHECK (true);