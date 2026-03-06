-- Criar tabela de feedback de sugestões
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

-- Criar tabela de alertas
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

-- Criar tabela de predições
CREATE TABLE public.analytics_predictions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id UUID NOT NULL,
  prediction_type TEXT NOT NULL,
  predicted_value NUMERIC NOT NULL,
  confidence_score NUMERIC CHECK (confidence_score >= 0 AND confidence_score <= 100),
  prediction_date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.suggestion_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_predictions ENABLE ROW LEVEL SECURITY;

-- RLS Policies para suggestion_feedback
CREATE POLICY "Restaurant owners can manage their feedback"
ON public.suggestion_feedback
FOR ALL
USING (auth.uid() = restaurant_id);

CREATE POLICY "Admins can view all feedback"
ON public.suggestion_feedback
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies para analytics_alerts
CREATE POLICY "Restaurant owners can manage their alerts"
ON public.analytics_alerts
FOR ALL
USING (auth.uid() = restaurant_id);

CREATE POLICY "Admins can view all alerts"
ON public.analytics_alerts
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies para analytics_predictions
CREATE POLICY "Restaurant owners can view their predictions"
ON public.analytics_predictions
FOR SELECT
USING (auth.uid() = restaurant_id);

CREATE POLICY "System can create predictions"
ON public.analytics_predictions
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Admins can view all predictions"
ON public.analytics_predictions
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Trigger para atualizar updated_at
CREATE TRIGGER update_suggestion_feedback_updated_at
BEFORE UPDATE ON public.suggestion_feedback
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Índices para performance
CREATE INDEX idx_suggestion_feedback_restaurant ON public.suggestion_feedback(restaurant_id);
CREATE INDEX idx_analytics_alerts_restaurant ON public.analytics_alerts(restaurant_id);
CREATE INDEX idx_analytics_alerts_unread ON public.analytics_alerts(restaurant_id, is_read) WHERE is_read = FALSE;
CREATE INDEX idx_analytics_predictions_restaurant ON public.analytics_predictions(restaurant_id);
CREATE INDEX idx_analytics_predictions_date ON public.analytics_predictions(prediction_date);