-- Fix security definer view issue by dropping the view and using only the function
DROP VIEW IF EXISTS public.public_products;