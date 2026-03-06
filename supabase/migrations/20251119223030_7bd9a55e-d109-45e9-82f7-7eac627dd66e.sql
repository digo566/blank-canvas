-- Permitir que visitantes não autenticados criem clientes
CREATE POLICY "Anyone can create clients" ON public.clients
FOR INSERT
WITH CHECK (true);

-- Permitir que visitantes não autenticados criem carrinhos
CREATE POLICY "Anyone can create carts" ON public.carts
FOR INSERT
WITH CHECK (true);