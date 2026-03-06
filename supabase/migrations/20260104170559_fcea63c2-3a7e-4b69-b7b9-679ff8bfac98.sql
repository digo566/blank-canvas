-- Create storage bucket for category images
INSERT INTO storage.buckets (id, name, public)
VALUES ('category-images', 'category-images', true)
ON CONFLICT (id) DO NOTHING;

-- Add image_url column to product_categories if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'product_categories' 
    AND column_name = 'image_url'
  ) THEN
    ALTER TABLE public.product_categories ADD COLUMN image_url TEXT;
  END IF;
END $$;

-- Create storage policies for category images
CREATE POLICY "Anyone can view category images"
ON storage.objects FOR SELECT
USING (bucket_id = 'category-images');

CREATE POLICY "Authenticated users can upload category images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'category-images' AND auth.role() = 'authenticated');

CREATE POLICY "Users can update their own category images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'category-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own category images"
ON storage.objects FOR DELETE
USING (bucket_id = 'category-images' AND auth.uid()::text = (storage.foldername(name))[1]);