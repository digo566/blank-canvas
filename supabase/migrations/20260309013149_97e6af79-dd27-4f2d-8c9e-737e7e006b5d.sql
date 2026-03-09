
CREATE TABLE public.system_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL,
  category text NOT NULL DEFAULT 'geral',
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  message text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.system_feedback ENABLE ROW LEVEL SECURITY;

-- Restaurants can insert and view their own feedback
CREATE POLICY "Restaurants can insert their feedback"
  ON public.system_feedback FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = restaurant_id);

CREATE POLICY "Restaurants can view their own feedback"
  ON public.system_feedback FOR SELECT TO authenticated
  USING (auth.uid() = restaurant_id);

-- Admins can view all feedback
CREATE POLICY "Admins can view all system feedback"
  ON public.system_feedback FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'));

-- Admins can delete feedback
CREATE POLICY "Admins can delete system feedback"
  ON public.system_feedback FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'));
