
-- SECURITY FIX: Remove direct user INSERT/UPDATE policies on subscriptions
-- All subscription changes MUST go through the edge function (service_role)

-- Drop existing dangerous policies
DROP POLICY IF EXISTS "Users can insert their own subscription" ON public.subscriptions;
DROP POLICY IF EXISTS "Users can update their own subscription" ON public.subscriptions;

-- Users can ONLY read their own subscription (no direct writes)
-- The edge function uses service_role to bypass RLS for writes
