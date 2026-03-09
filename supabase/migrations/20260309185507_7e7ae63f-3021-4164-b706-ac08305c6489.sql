
UPDATE public.profiles 
SET asaas_customer_id = NULL, 
    asaas_account_status = 'inactive', 
    asaas_onboarding_url = NULL, 
    asaas_created_at = NULL 
WHERE id = '6e5d76ad-d004-4a9f-b247-db03cd9e398f';
