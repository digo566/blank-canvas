
-- 1. PROFILES: Remove overly broad SELECT that exposes all profiles to any authenticated user
DROP POLICY IF EXISTS "Public can view limited restaurant profile data" ON public.profiles;

-- Add admin access to profiles (owners already have "Users can view their own profile")
CREATE POLICY "Admins can view all profiles"
ON public.profiles FOR SELECT
USING (has_role(auth.uid(), 'admin'));

-- 2. CLIENTS: Remove overly broad policy that grants SELECT to ANY authenticated user
DROP POLICY IF EXISTS "Anonymous users cannot access clients" ON public.clients;

-- 3. SUBSCRIPTIONS: Create secure RPC that hides payment gateway IDs
-- Drop the user-facing SELECT policy that exposes asaas IDs
DROP POLICY IF EXISTS "Users can view their own subscription" ON public.subscriptions;

-- Create a secure function that returns only non-sensitive subscription fields
CREATE OR REPLACE FUNCTION public.get_my_subscription()
RETURNS TABLE(
  id uuid,
  status text,
  value numeric,
  next_due_date date,
  billing_type text,
  cycle text,
  created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT s.id, s.status, s.value, s.next_due_date, s.billing_type, s.cycle, s.created_at
  FROM public.subscriptions s
  WHERE s.user_id = auth.uid();
$$;
