-- Create product categories table
CREATE TABLE public.product_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id UUID NOT NULL,
  name TEXT NOT NULL,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.product_categories ENABLE ROW LEVEL SECURITY;

-- Anyone can view categories (for public store)
CREATE POLICY "Anyone can view product categories"
ON public.product_categories
FOR SELECT
USING (true);

-- Restaurant owners can manage their categories
CREATE POLICY "Restaurant owners can manage their categories"
ON public.product_categories
FOR ALL
USING (auth.uid() = restaurant_id);

-- Add category_id to products table
ALTER TABLE public.products 
ADD COLUMN category_id UUID REFERENCES public.product_categories(id) ON DELETE SET NULL;

-- Create trigger for updated_at
CREATE TRIGGER update_product_categories_updated_at
BEFORE UPDATE ON public.product_categories
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();