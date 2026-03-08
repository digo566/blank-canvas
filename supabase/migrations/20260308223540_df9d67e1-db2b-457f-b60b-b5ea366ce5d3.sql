
-- Add fiscal columns to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS fiscal_cnpj text,
ADD COLUMN IF NOT EXISTS fiscal_razao_social text,
ADD COLUMN IF NOT EXISTS fiscal_nome_fantasia text,
ADD COLUMN IF NOT EXISTS fiscal_inscricao_municipal text,
ADD COLUMN IF NOT EXISTS fiscal_endereco text;

-- Create pre_notas_fiscais table
CREATE TABLE public.pre_notas_fiscais (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  restaurant_id uuid NOT NULL,
  customer_name text,
  customer_cpf text,
  company_cnpj text,
  company_name text,
  descricao text DEFAULT 'Venda de alimentos via delivery',
  valor_total numeric NOT NULL,
  data_venda timestamp with time zone NOT NULL,
  pdf_url text,
  created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.pre_notas_fiscais ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Restaurant owners can manage their pre-notas"
ON public.pre_notas_fiscais FOR ALL
TO authenticated
USING (auth.uid() = restaurant_id)
WITH CHECK (auth.uid() = restaurant_id);

-- Storage bucket for pre-notas PDFs
INSERT INTO storage.buckets (id, name, public) VALUES ('pre-notas', 'pre-notas', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Restaurant owners can upload pre-notas"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'pre-notas' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Anyone can view pre-notas"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'pre-notas');

CREATE POLICY "Restaurant owners can delete pre-notas"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'pre-notas' AND (storage.foldername(name))[1] = auth.uid()::text);
