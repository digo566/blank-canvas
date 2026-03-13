
-- Add assigned_to column to crm_leads
ALTER TABLE public.crm_leads ADD COLUMN IF NOT EXISTS assigned_to uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- Update RLS: admins see all, sellers see only their own
DROP POLICY IF EXISTS "Admins and sellers can manage CRM leads" ON public.crm_leads;

CREATE POLICY "Admins can manage all CRM leads"
ON public.crm_leads FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Sellers can manage their own CRM leads"
ON public.crm_leads FOR ALL TO authenticated
USING (has_role(auth.uid(), 'seller'::app_role) AND assigned_to = auth.uid())
WITH CHECK (has_role(auth.uid(), 'seller'::app_role) AND assigned_to = auth.uid());

-- Same for interactions: sellers only see interactions on their leads
DROP POLICY IF EXISTS "Admins and sellers can manage CRM interactions" ON public.crm_interactions;

CREATE POLICY "Admins can manage all CRM interactions"
ON public.crm_interactions FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Sellers can manage interactions on their leads"
ON public.crm_interactions FOR ALL TO authenticated
USING (has_role(auth.uid(), 'seller'::app_role) AND EXISTS (
  SELECT 1 FROM public.crm_leads WHERE id = crm_interactions.lead_id AND assigned_to = auth.uid()
))
WITH CHECK (has_role(auth.uid(), 'seller'::app_role) AND EXISTS (
  SELECT 1 FROM public.crm_leads WHERE id = crm_interactions.lead_id AND assigned_to = auth.uid()
));
