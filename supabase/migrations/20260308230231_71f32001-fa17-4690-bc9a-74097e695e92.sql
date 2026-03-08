
-- Loyalty configuration per restaurant
CREATE TABLE public.loyalty_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL UNIQUE,
  is_enabled boolean NOT NULL DEFAULT false,
  spend_threshold numeric NOT NULL DEFAULT 100,
  reward_type text NOT NULL DEFAULT 'percentage',
  reward_value numeric NOT NULL DEFAULT 10,
  reward_description text DEFAULT 'Desconto de fidelidade',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.loyalty_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Restaurant owners can manage their loyalty config"
  ON public.loyalty_config FOR ALL
  USING (auth.uid() = restaurant_id)
  WITH CHECK (auth.uid() = restaurant_id);

-- Loyalty progress per customer per restaurant (tracked by phone)
CREATE TABLE public.loyalty_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL,
  client_id uuid REFERENCES public.clients(id) ON DELETE CASCADE,
  phone text NOT NULL,
  total_spent numeric NOT NULL DEFAULT 0,
  rewards_earned integer NOT NULL DEFAULT 0,
  rewards_redeemed integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(restaurant_id, phone)
);

ALTER TABLE public.loyalty_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Restaurant owners can manage their loyalty progress"
  ON public.loyalty_progress FOR ALL
  USING (auth.uid() = restaurant_id)
  WITH CHECK (auth.uid() = restaurant_id);

CREATE POLICY "Clients can view their own loyalty progress"
  ON public.loyalty_progress FOR SELECT
  USING (
    client_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.clients WHERE clients.id = loyalty_progress.client_id AND clients.user_id = auth.uid()
    )
  );
