
-- Update CRM leads policy to include sellers
DROP POLICY IF EXISTS "Admins can manage all CRM leads" ON public.crm_leads;
CREATE POLICY "Admins and sellers can manage CRM leads"
ON public.crm_leads
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'seller'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'seller'::app_role));

-- Update CRM interactions policy to include sellers
DROP POLICY IF EXISTS "Admins can manage all CRM interactions" ON public.crm_interactions;
CREATE POLICY "Admins and sellers can manage CRM interactions"
ON public.crm_interactions
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'seller'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'seller'::app_role));

-- Create function to auto-assign seller role to specific emails
CREATE OR REPLACE FUNCTION public.assign_seller_role_on_signup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.email = 'rafael-magno@hotmail.com' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'seller')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger on auth.users for seller assignment
DROP TRIGGER IF EXISTS assign_seller_role_trigger ON auth.users;
CREATE TRIGGER assign_seller_role_trigger
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.assign_seller_role_on_signup();
