import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { calculateFinancialMetrics, analyzeProducts, generateFinancialAlerts, generateBusinessDiagnosis } from '@/lib/finance/financialEngine';
import type { FinancialMetrics, ProductAnalysis, FinancialAlert, BusinessHealthDiagnosis } from '@/lib/finance/types';

export function useFinancialData() {
  const [metrics, setMetrics] = useState<FinancialMetrics | null>(null);
  const [products, setProducts] = useState<ProductAnalysis[]>([]);
  const [alerts, setAlerts] = useState<FinancialAlert[]>([]);
  const [diagnosis, setDiagnosis] = useState<BusinessHealthDiagnosis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true); setError(null);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');
      const [m, p, a, d] = await Promise.all([calculateFinancialMetrics(user.id), analyzeProducts(user.id), generateFinancialAlerts(user.id), generateBusinessDiagnosis(user.id)]);
      setMetrics(m); setProducts(p); setAlerts(a); setDiagnosis(d);
    } catch (err) { setError(err instanceof Error ? err.message : 'Erro ao carregar dados'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);
  return { metrics, products, alerts, diagnosis, loading, error, refetch: fetchData };
}
