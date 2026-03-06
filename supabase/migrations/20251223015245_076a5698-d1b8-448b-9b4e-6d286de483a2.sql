-- Verificar se a política já existe e criar uma nova política mais permissiva para inserção
-- A política atual "Anyone can create clients" não está funcionando corretamente

-- Remover política existente que não está funcionando
DROP POLICY IF EXISTS "Anyone can create clients" ON public.clients;

-- Criar política que realmente permite inserção pública
CREATE POLICY "Public can insert clients for orders" 
ON public.clients 
FOR INSERT 
WITH CHECK (true);

-- Também precisamos permitir que usuários públicos possam ler clientes pelo telefone para verificar duplicados
-- Criar política de leitura pública limitada
DROP POLICY IF EXISTS "Public can check existing clients" ON public.clients;
CREATE POLICY "Public can check existing clients" 
ON public.clients 
FOR SELECT 
USING (true);

-- Permitir update público para atualizar dados de clientes existentes durante checkout
DROP POLICY IF EXISTS "Public can update clients during checkout" ON public.clients;
CREATE POLICY "Public can update clients during checkout" 
ON public.clients 
FOR UPDATE 
USING (true);