
-- ========================================
-- GRAPE SYSTEM - Consolidated Migration
-- ========================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enums
CREATE TYPE order_status AS ENUM ('pending', 'preparing', 'ready', 'delivered', 'cancelled', 'on_the_way');
CREATE TYPE app_role AS ENUM ('admin', 'restaurant');

-- ========================================
-- CORE TABLES
-- ========================================

-- Profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  restaurant_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  logo_url TEXT,
  cover_url TEXT,
  opening_hours JSONB DEFAULT '{
    "monday": {"open": "08:00", "close": "22:00", "closed": false},
    "tuesday": {"open": "08:00", "close": "22:00", "closed": false},
    "wednesday": {"open": "08:00", "close": "22:00", "closed": false},
    "thursday": {"open": "08:00", "close": "22:00", "closed": false},
    "friday": {"open": "08:00", "close": "22:00", "closed": false},
    "saturday": {"open": "08:00", "close": "22:00", "closed": false},
    "sunday": {"open": "08:00", "close": "22:00", "closed": false}
  }'::jsonb,
  show_phone_publicly boolean DEFAULT true,
  min_delivery_time integer DEFAULT 30,
  max_delivery_time integer DEFAULT 60,
  trial_ends_at timestamp with time zone DEFAULT (now() + interval '7 days'),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User Roles
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, role)
);

-- Product Categories
CREATE TABLE public.product_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id UUID NOT NULL,
  name TEXT NOT NULL,
  display_order INTEGER DEFAULT 0,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Products
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL CHECK (price >= 0),
  cost_price NUMERIC(10,2) DEFAULT 0,
  profit_margin NUMERIC(5,2) GENERATED ALWAYS AS (
    CASE WHEN cost_price > 0 THEN ((price - cost_price) / cost_price * 100) ELSE 0 END
  ) STORED,
  image_url TEXT,
  available BOOLEAN DEFAULT true,
  category_id UUID REFERENCES public.product_categories(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Product Option Groups
CREATE TABLE public.product_option_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  name text NOT NULL,
  is_required boolean DEFAULT false,
  min_selections integer DEFAULT 0,
  max_selections integer DEFAULT 1,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Product Option Items
CREATE TABLE public.product_option_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  option_group_id uuid NOT NULL REFERENCES public.product_option_groups(id) ON DELETE CASCADE,
  name text NOT NULL,
  price_modifier numeric DEFAULT 0,
  created_at timestamp with time zone DEFAULT now()
);

-- Clients
CREATE TABLE public.clients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email text,
  notes TEXT,
  tags TEXT[],
  address TEXT,
  is_registered BOOLEAN DEFAULT false,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  password_hash TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Orders
CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  total_amount DECIMAL(10,2) NOT NULL CHECK (total_amount >= 0),
  status order_status DEFAULT 'pending',
  payment_method TEXT,
  preparation_started_at TIMESTAMP WITH TIME ZONE,
  ready_at TIMESTAMP WITH TIME ZONE,
  delivered_at TIMESTAMP WITH TIME ZONE,
  needs_change boolean DEFAULT false,
  change_amount numeric,
  notes text,
  tracking_code TEXT UNIQUE,
  cart_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Order Items
CREATE TABLE public.order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price DECIMAL(10,2) NOT NULL CHECK (unit_price >= 0),
  subtotal DECIMAL(10,2) NOT NULL CHECK (subtotal >= 0),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Order Item Options
CREATE TABLE public.order_item_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_item_id uuid NOT NULL REFERENCES public.order_items(id) ON DELETE CASCADE,
  option_item_id uuid NOT NULL REFERENCES public.product_option_items(id),
  option_item_name text NOT NULL,
  price_modifier numeric DEFAULT 0,
  created_at timestamp with time zone DEFAULT now()
);

-- Carts
CREATE TABLE public.carts (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  restaurant_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  abandoned_at TIMESTAMP WITH TIME ZONE,
  is_abandoned BOOLEAN DEFAULT FALSE,
  contacted BOOLEAN DEFAULT FALSE
);

-- Add FK for orders.cart_id
ALTER TABLE public.orders ADD CONSTRAINT orders_cart_id_fkey FOREIGN KEY (cart_id) REFERENCES public.carts(id);

-- Cart Items
CREATE TABLE public.cart_items (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  cart_id UUID NOT NULL REFERENCES public.carts(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Interactions
CREATE TABLE public.interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  restaurant_id UUID NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('whatsapp', 'email', 'phone', 'other')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================================
-- FINANCE TABLES
-- ========================================

CREATE TABLE public.expense_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('fixed', 'variable')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE public.expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL,
  category_id UUID REFERENCES public.expense_categories(id) ON DELETE SET NULL,
  amount NUMERIC NOT NULL,
  description TEXT,
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  is_recurring BOOLEAN DEFAULT false,
  recurring_day INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE public.accounts_payable (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL,
  supplier_name TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  due_date DATE NOT NULL,
  paid_date DATE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'overdue')),
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE public.accounts_receivable (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL,
  client_name TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  due_date DATE NOT NULL,
  received_date DATE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'received', 'overdue')),
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE public.inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL,
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
  ingredient_name TEXT,
  current_quantity NUMERIC NOT NULL DEFAULT 0,
  min_quantity NUMERIC NOT NULL DEFAULT 0,
  unit TEXT NOT NULL DEFAULT 'un',
  unit_cost NUMERIC DEFAULT 0,
  last_purchase_date DATE,
  avg_daily_consumption NUMERIC DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE public.inventory_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inventory_id UUID NOT NULL REFERENCES public.inventory(id) ON DELETE CASCADE,
  restaurant_id UUID NOT NULL,
  quantity NUMERIC NOT NULL,
  movement_type TEXT NOT NULL CHECK (movement_type IN ('in', 'out', 'adjustment')),
  unit_cost NUMERIC,
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE public.financial_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL,
  period_type TEXT NOT NULL CHECK (period_type IN ('daily', 'weekly', 'monthly')),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  total_revenue NUMERIC DEFAULT 0,
  total_expenses NUMERIC DEFAULT 0,
  gross_profit NUMERIC DEFAULT 0,
  net_profit NUMERIC DEFAULT 0,
  total_orders INTEGER DEFAULT 0,
  avg_ticket NUMERIC DEFAULT 0,
  health_score INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE public.ai_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- ========================================
-- ANALYTICS TABLES
-- ========================================

CREATE TABLE public.suggestion_feedback (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id UUID NOT NULL,
  suggestion_type TEXT NOT NULL,
  suggestion_text TEXT NOT NULL,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  was_helpful BOOLEAN,
  was_implemented BOOLEAN DEFAULT FALSE,
  feedback_comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.analytics_alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id UUID NOT NULL,
  alert_type TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('baixa', 'média', 'alta', 'crítica')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  metric_value NUMERIC,
  threshold_value NUMERIC,
  is_read BOOLEAN DEFAULT FALSE,
  is_resolved BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  resolved_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE public.analytics_predictions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id UUID NOT NULL,
  prediction_type TEXT NOT NULL,
  predicted_value NUMERIC NOT NULL,
  confidence_score NUMERIC CHECK (confidence_score >= 0 AND confidence_score <= 100),
  prediction_date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- ========================================
-- LEADS & SUBSCRIPTIONS
-- ========================================

CREATE TABLE public.leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  whatsapp text NOT NULL,
  restaurant_name text NOT NULL,
  status text NOT NULL DEFAULT 'new',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  asaas_customer_id text,
  asaas_subscription_id text,
  status text NOT NULL DEFAULT 'pending',
  billing_type text,
  value numeric NOT NULL DEFAULT 1.00,
  cycle text DEFAULT 'MONTHLY',
  next_due_date date,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- ========================================
-- ENABLE RLS ON ALL TABLES
-- ========================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_option_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_option_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_item_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.carts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounts_payable ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounts_receivable ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suggestion_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- ========================================
-- FUNCTIONS
-- ========================================

-- has_role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- update_updated_at_column
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger LANGUAGE plpgsql SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- handle_new_user
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (id, restaurant_name, phone, trial_ends_at)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'restaurant_name', 'Meu Restaurante'),
    COALESCE(NEW.raw_user_meta_data->>'phone', ''),
    now() + interval '7 days'
  );
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'restaurant');
  RETURN NEW;
END;
$$;

-- update_order_timestamps
CREATE OR REPLACE FUNCTION update_order_timestamps()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'preparing' AND OLD.status = 'pending' THEN
    NEW.preparation_started_at = NOW();
  ELSIF NEW.status = 'ready' AND OLD.status = 'preparing' THEN
    NEW.ready_at = NOW();
  ELSIF NEW.status = 'delivered' AND OLD.status = 'ready' THEN
    NEW.delivered_at = NOW();
  END IF;
  RETURN NEW;
END;
$$;

-- mark_abandoned_carts
CREATE OR REPLACE FUNCTION public.mark_abandoned_carts()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  UPDATE public.carts
  SET is_abandoned = TRUE, abandoned_at = NOW()
  WHERE restaurant_id = auth.uid()
    AND updated_at < NOW() - INTERVAL '15 minutes'
    AND is_abandoned = FALSE
    AND id NOT IN (SELECT DISTINCT cart_id FROM public.orders WHERE cart_id IS NOT NULL);
END;
$$;

-- update_cart_timestamp
CREATE OR REPLACE FUNCTION update_cart_timestamp()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public
AS $$
BEGIN
  UPDATE public.carts SET updated_at = NOW() WHERE id = NEW.cart_id;
  RETURN NEW;
END;
$$;

-- generate_tracking_code (internal only)
CREATE OR REPLACE FUNCTION public.generate_tracking_code()
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE code TEXT; exists_check BOOLEAN;
BEGIN
  LOOP
    code := upper(substring(md5(random()::text || clock_timestamp()::text) from 1 for 8));
    SELECT EXISTS(SELECT 1 FROM public.orders WHERE tracking_code = code) INTO exists_check;
    EXIT WHEN NOT exists_check;
  END LOOP;
  RETURN code;
END;
$$;

-- set_tracking_code_on_insert
CREATE OR REPLACE FUNCTION public.set_tracking_code_on_insert()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE code TEXT; exists_check BOOLEAN;
BEGIN
  IF NEW.tracking_code IS NULL THEN
    LOOP
      code := upper(substring(md5(random()::text || clock_timestamp()::text) from 1 for 8));
      SELECT EXISTS(SELECT 1 FROM public.orders WHERE tracking_code = code) INTO exists_check;
      EXIT WHEN NOT exists_check;
    END LOOP;
    NEW.tracking_code := code;
  END IF;
  RETURN NEW;
END;
$$;

-- clear_tracking_code_on_delivery
CREATE OR REPLACE FUNCTION public.clear_tracking_code_on_delivery()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.status = 'delivered' AND OLD.status != 'delivered' THEN
    NEW.tracking_code = NULL;
  END IF;
  RETURN NEW;
END;
$$;

-- get_public_profile
CREATE OR REPLACE FUNCTION public.get_public_profile(profile_id uuid)
RETURNS TABLE (id uuid, restaurant_name text, opening_hours jsonb, logo_url text, cover_url text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT p.id, p.restaurant_name, p.opening_hours, p.logo_url, p.cover_url
  FROM public.profiles p WHERE p.id = profile_id;
$$;

-- get_public_profile_with_phone
CREATE OR REPLACE FUNCTION public.get_public_profile_with_phone(profile_id uuid)
RETURNS TABLE(id uuid, restaurant_name text, phone text, opening_hours jsonb, logo_url text, cover_url text, min_delivery_time integer, max_delivery_time integer)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT p.id, p.restaurant_name,
    CASE WHEN p.show_phone_publicly = true THEN p.phone ELSE NULL END as phone,
    p.opening_hours, p.logo_url, p.cover_url, p.min_delivery_time, p.max_delivery_time
  FROM public.profiles p WHERE p.id = profile_id;
$$;

-- get_public_products
CREATE OR REPLACE FUNCTION public.get_public_products(restaurant_id_param uuid)
RETURNS TABLE(id uuid, restaurant_id uuid, name text, description text, price numeric, image_url text, available boolean, category_id uuid, created_at timestamp with time zone, updated_at timestamp with time zone)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT p.id, p.restaurant_id, p.name, p.description, p.price, p.image_url, p.available, p.category_id, p.created_at, p.updated_at
  FROM public.products p WHERE p.restaurant_id = restaurant_id_param AND p.available = true ORDER BY p.created_at DESC;
$$;

-- get_public_products_safe
CREATE OR REPLACE FUNCTION public.get_public_products_safe(restaurant_id_param uuid)
RETURNS TABLE(id uuid, restaurant_id uuid, name text, description text, price numeric, image_url text, available boolean, category_id uuid, created_at timestamp with time zone, updated_at timestamp with time zone)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT p.id, p.restaurant_id, p.name, p.description, p.price, p.image_url, p.available, p.category_id, p.created_at, p.updated_at
  FROM public.products p WHERE p.restaurant_id = restaurant_id_param AND p.available = true ORDER BY p.created_at DESC;
$$;

-- check_restaurant_subscription
CREATE OR REPLACE FUNCTION public.check_restaurant_subscription(restaurant_id_param uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT EXISTS (SELECT 1 FROM public.subscriptions WHERE user_id = restaurant_id_param AND status = 'active')
  OR EXISTS (SELECT 1 FROM public.profiles WHERE id = restaurant_id_param AND trial_ends_at IS NOT NULL AND trial_ends_at > now())
  OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = restaurant_id_param AND role = 'admin')
$$;

-- get_my_subscription
CREATE OR REPLACE FUNCTION public.get_my_subscription()
RETURNS TABLE(id uuid, status text, value numeric, next_due_date date, billing_type text, cycle text, created_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT s.id, s.status, s.value, s.next_due_date, s.billing_type, s.cycle, s.created_at
  FROM public.subscriptions s WHERE s.user_id = auth.uid();
$$;

-- ========================================
-- TRIGGERS
-- ========================================

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON public.clients FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_product_categories_updated_at BEFORE UPDATE ON public.product_categories FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_inventory_updated_at BEFORE UPDATE ON public.inventory FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_suggestion_feedback_updated_at BEFORE UPDATE ON public.suggestion_feedback FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON public.subscriptions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER order_status_timestamp_trigger BEFORE UPDATE ON orders FOR EACH ROW EXECUTE FUNCTION update_order_timestamps();
CREATE TRIGGER set_tracking_code_trigger BEFORE INSERT ON public.orders FOR EACH ROW EXECUTE FUNCTION public.set_tracking_code_on_insert();
CREATE TRIGGER trigger_clear_tracking_code BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.clear_tracking_code_on_delivery();
CREATE TRIGGER update_cart_on_item_change AFTER INSERT OR UPDATE OR DELETE ON public.cart_items FOR EACH ROW EXECUTE FUNCTION update_cart_timestamp();
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ========================================
-- RLS POLICIES
-- ========================================

-- Profiles
CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT USING (has_role(auth.uid(), 'admin'));

-- User Roles
CREATE POLICY "Users can view their own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- Products
CREATE POLICY "Restaurant owners can manage their products" ON public.products FOR ALL USING (auth.uid() = restaurant_id);
CREATE POLICY "Authenticated users can view available products" ON public.products FOR SELECT USING ((available = true AND auth.uid() IS NOT NULL) OR auth.uid() = restaurant_id OR has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can view all products" ON public.products FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- Product Categories
CREATE POLICY "Restaurant owners can manage their categories" ON public.product_categories FOR ALL TO authenticated USING (auth.uid() = restaurant_id) WITH CHECK (auth.uid() = restaurant_id);
CREATE POLICY "Public can view categories for store" ON public.product_categories FOR SELECT TO anon USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = restaurant_id));

-- Product Option Groups
CREATE POLICY "Restaurant owners can manage option groups" ON public.product_option_groups FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.products p WHERE p.id = product_id AND p.restaurant_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.products p WHERE p.id = product_id AND p.restaurant_id = auth.uid()));
CREATE POLICY "Public can view option groups for available products" ON public.product_option_groups FOR SELECT TO anon
  USING (EXISTS (SELECT 1 FROM public.products p WHERE p.id = product_id AND p.available = true));

-- Product Option Items
CREATE POLICY "Restaurant owners can manage option items" ON public.product_option_items FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.product_option_groups og JOIN public.products p ON p.id = og.product_id WHERE og.id = option_group_id AND p.restaurant_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.product_option_groups og JOIN public.products p ON p.id = og.product_id WHERE og.id = option_group_id AND p.restaurant_id = auth.uid()));
CREATE POLICY "Public can view option items for available products" ON public.product_option_items FOR SELECT TO anon
  USING (EXISTS (SELECT 1 FROM public.product_option_groups og JOIN public.products p ON p.id = og.product_id WHERE og.id = option_group_id AND p.available = true));

-- Clients
CREATE POLICY "Restaurant owners can manage their clients" ON public.clients FOR ALL USING (auth.uid() = restaurant_id);
CREATE POLICY "Clients can view and update their own data" ON public.clients FOR ALL USING (auth.uid() = user_id);

-- Orders
CREATE POLICY "Restaurant owners can view their orders" ON public.orders FOR SELECT USING (auth.uid() = restaurant_id);
CREATE POLICY "Restaurant owners can insert orders" ON public.orders FOR INSERT WITH CHECK (auth.uid() = restaurant_id);
CREATE POLICY "Restaurant owners can update their orders" ON public.orders FOR UPDATE USING (auth.uid() = restaurant_id);
CREATE POLICY "Clients can view their own orders" ON public.orders FOR SELECT USING (EXISTS (SELECT 1 FROM public.clients WHERE clients.id = orders.client_id AND clients.user_id = auth.uid()));
CREATE POLICY "Admins can view all orders" ON public.orders FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

-- Order Items
CREATE POLICY "Order items inherit order permissions" ON public.order_items FOR SELECT USING (EXISTS (SELECT 1 FROM orders WHERE orders.id = order_items.order_id AND (orders.restaurant_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role) OR EXISTS (SELECT 1 FROM public.clients WHERE clients.id = orders.client_id AND clients.user_id = auth.uid()))));
CREATE POLICY "Owners can insert order items" ON public.order_items FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.orders WHERE orders.id = order_items.order_id AND orders.restaurant_id = auth.uid()));
CREATE POLICY "Owners can update order items" ON public.order_items FOR UPDATE USING (EXISTS (SELECT 1 FROM public.orders WHERE orders.id = order_items.order_id AND (orders.restaurant_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role))));
CREATE POLICY "Owners can delete order items" ON public.order_items FOR DELETE USING (EXISTS (SELECT 1 FROM public.orders WHERE orders.id = order_items.order_id AND (orders.restaurant_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role))));

-- Order Item Options
CREATE POLICY "Users can view their order item options" ON public.order_item_options FOR SELECT USING (EXISTS (SELECT 1 FROM public.order_items JOIN public.orders ON orders.id = order_items.order_id WHERE order_items.id = order_item_options.order_item_id AND (orders.restaurant_id = auth.uid() OR EXISTS (SELECT 1 FROM public.clients WHERE clients.id = orders.client_id AND clients.user_id = auth.uid()))));

-- Carts
CREATE POLICY "Clients can view their own carts" ON public.carts FOR SELECT USING (EXISTS (SELECT 1 FROM public.clients WHERE clients.id = carts.client_id AND clients.user_id = auth.uid()));
CREATE POLICY "Clients can create their own carts" ON public.carts FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.clients WHERE clients.id = carts.client_id AND clients.user_id = auth.uid()));
CREATE POLICY "Clients can update their own carts" ON public.carts FOR UPDATE USING (EXISTS (SELECT 1 FROM public.clients WHERE clients.id = carts.client_id AND clients.user_id = auth.uid()));
CREATE POLICY "Restaurant owners can view their carts" ON public.carts FOR SELECT USING (auth.uid() = restaurant_id);

-- Cart Items
CREATE POLICY "Users can manage their cart items" ON public.cart_items FOR ALL USING (EXISTS (SELECT 1 FROM public.carts JOIN public.clients ON clients.id = carts.client_id WHERE carts.id = cart_items.cart_id AND (clients.user_id = auth.uid() OR carts.restaurant_id = auth.uid())));

-- Interactions
CREATE POLICY "Restaurant owners can manage their interactions" ON interactions FOR ALL USING (auth.uid() = restaurant_id);

-- Finance tables
CREATE POLICY "Restaurant owners can manage their expense categories" ON public.expense_categories FOR ALL USING (auth.uid() = restaurant_id);
CREATE POLICY "Restaurant owners can manage their expenses" ON public.expenses FOR ALL USING (auth.uid() = restaurant_id);
CREATE POLICY "Restaurant owners can manage their accounts payable" ON public.accounts_payable FOR ALL USING (auth.uid() = restaurant_id);
CREATE POLICY "Restaurant owners can manage their accounts receivable" ON public.accounts_receivable FOR ALL USING (auth.uid() = restaurant_id);
CREATE POLICY "Restaurant owners can manage their inventory" ON public.inventory FOR ALL USING (auth.uid() = restaurant_id);
CREATE POLICY "Restaurant owners can manage their inventory movements" ON public.inventory_movements FOR ALL USING (auth.uid() = restaurant_id);

-- Financial Summaries (granular)
CREATE POLICY "Restaurant owners can view their financial summaries" ON public.financial_summaries FOR SELECT USING (auth.uid() = restaurant_id);
CREATE POLICY "Restaurant owners can insert their financial summaries" ON public.financial_summaries FOR INSERT WITH CHECK (auth.uid() = restaurant_id);
CREATE POLICY "Restaurant owners can update their financial summaries" ON public.financial_summaries FOR UPDATE USING (auth.uid() = restaurant_id);

-- AI Conversations
CREATE POLICY "Restaurant owners can manage their AI conversations" ON public.ai_conversations FOR ALL USING (auth.uid() = restaurant_id);

-- Analytics
CREATE POLICY "Restaurant owners can manage their feedback" ON public.suggestion_feedback FOR ALL USING (auth.uid() = restaurant_id);
CREATE POLICY "Admins can view all feedback" ON public.suggestion_feedback FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Restaurant owners can manage their alerts" ON public.analytics_alerts FOR ALL USING (auth.uid() = restaurant_id);
CREATE POLICY "Admins can view all alerts" ON public.analytics_alerts FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Restaurant owners can view their predictions" ON public.analytics_predictions FOR SELECT USING (auth.uid() = restaurant_id);
CREATE POLICY "System can create predictions" ON public.analytics_predictions FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins can view all predictions" ON public.analytics_predictions FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

-- Leads
CREATE POLICY "Anyone can insert leads" ON public.leads FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins can view all leads" ON public.leads FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update leads" ON public.leads FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete leads" ON public.leads FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Subscriptions (read-only for users, writes via edge function service_role)
CREATE POLICY "Admins can view all subscriptions" ON public.subscriptions FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'));

-- ========================================
-- INDEXES
-- ========================================

CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);
CREATE INDEX IF NOT EXISTS idx_orders_restaurant_id ON orders(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_orders_tracking_code ON public.orders(tracking_code);
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON order_items(product_id);
CREATE INDEX IF NOT EXISTS idx_clients_restaurant_id ON clients(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_suggestion_feedback_restaurant ON public.suggestion_feedback(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_analytics_alerts_restaurant ON public.analytics_alerts(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_analytics_alerts_unread ON public.analytics_alerts(restaurant_id, is_read) WHERE is_read = FALSE;
CREATE INDEX IF NOT EXISTS idx_analytics_predictions_restaurant ON public.analytics_predictions(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_analytics_predictions_date ON public.analytics_predictions(prediction_date);

-- ========================================
-- STORAGE BUCKETS
-- ========================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('restaurant-images', 'restaurant-images', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/jpg']),
  ('product-images', 'product-images', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/jpg'])
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('category-images', 'category-images', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Restaurant owners can upload their restaurant images" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'restaurant-images' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Restaurant owners can update their restaurant images" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'restaurant-images' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Restaurant owners can delete their restaurant images" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'restaurant-images' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Anyone can view restaurant images" ON storage.objects FOR SELECT USING (bucket_id = 'restaurant-images');

CREATE POLICY "Restaurant owners can upload their product images" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'product-images' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Restaurant owners can update their product images" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'product-images' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Restaurant owners can delete their product images" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'product-images' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Anyone can view product images" ON storage.objects FOR SELECT USING (bucket_id = 'product-images');

CREATE POLICY "Anyone can view category images" ON storage.objects FOR SELECT USING (bucket_id = 'category-images');
CREATE POLICY "Authenticated users can upload category images" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'category-images' AND auth.role() = 'authenticated');
CREATE POLICY "Users can update their own category images" ON storage.objects FOR UPDATE USING (bucket_id = 'category-images' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can delete their own category images" ON storage.objects FOR DELETE USING (bucket_id = 'category-images' AND auth.uid()::text = (storage.foldername(name))[1]);

-- ========================================
-- REALTIME
-- ========================================

ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;

-- ========================================
-- REVOKE DIRECT EXECUTION
-- ========================================

REVOKE EXECUTE ON FUNCTION public.generate_tracking_code() FROM anon;
REVOKE EXECUTE ON FUNCTION public.generate_tracking_code() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.set_tracking_code_on_insert() FROM anon;
REVOKE EXECUTE ON FUNCTION public.set_tracking_code_on_insert() FROM authenticated;
