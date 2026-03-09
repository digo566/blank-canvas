
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS asaas_customer_id text,
ADD COLUMN IF NOT EXISTS asaas_account_status text DEFAULT 'inactive',
ADD COLUMN IF NOT EXISTS asaas_onboarding_url text,
ADD COLUMN IF NOT EXISTS asaas_created_at timestamp with time zone;
