-- Corrigir políticas RLS da tabela carts para permitir checkout público

-- Remover políticas existentes que não permitem inserção pública
DROP POLICY IF EXISTS "Anyone can create carts" ON public.carts;
DROP POLICY IF EXISTS "Users can view their own carts" ON public.carts;
DROP POLICY IF EXISTS "Users can update their own carts" ON public.carts;

-- Permitir inserção pública de carrinhos durante checkout
CREATE POLICY "Public can insert carts for orders" 
ON public.carts 
FOR INSERT 
WITH CHECK (true);

-- Permitir leitura pública de carrinhos
CREATE POLICY "Public can view carts" 
ON public.carts 
FOR SELECT 
USING (true);

-- Permitir atualização pública de carrinhos
CREATE POLICY "Public can update carts" 
ON public.carts 
FOR UPDATE 
USING (true);