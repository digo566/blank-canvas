import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { analisarDadosInteligente } from "@/lib/analytics/intelligentAnalytics";
import { AnalysisInput, AnalysisOutput, Problem } from "@/lib/analytics/types";
import { Prediction } from "@/lib/analytics/predictions";

export function useIntelligentAnalytics() {
  const [analysis, setAnalysis] = useState<(AnalysisOutput & { predicoes: Prediction[] }) | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAndAnalyze = async () => {
    try {
      setLoading(true); setError(null);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setError("Usuário não autenticado"); return; }

      const dozeSemanasAtras = new Date(); dozeSemanasAtras.setDate(dozeSemanasAtras.getDate() - 84);
      const { data: orders } = await supabase.from("orders").select("*, order_items(*, product:products(name))").eq("restaurant_id", user.id).gte("created_at", dozeSemanasAtras.toISOString());
      const { data: carts } = await supabase.from("carts").select("*").eq("restaurant_id", user.id).gte("created_at", dozeSemanasAtras.toISOString());

      const semanas = 12;
      const pedidosPorSemana: number[] = []; const cancelamentosPorSemana: number[] = [];
      const abandonosPorSemana: number[] = []; const conversaoPorSemana: number[] = [];

      for (let i = semanas - 1; i >= 0; i--) {
        const ini = new Date(); ini.setDate(ini.getDate() - (i * 7 + 7));
        const fim = new Date(); fim.setDate(fim.getDate() - (i * 7));
        const ps = orders?.filter(o => { const d = new Date(o.created_at || ""); return d >= ini && d < fim; }) || [];
        const cs = carts?.filter(c => { const d = new Date(c.created_at || ""); return d >= ini && d < fim; }) || [];
        pedidosPorSemana.push(ps.length);
        cancelamentosPorSemana.push(ps.filter(o => o.status === "cancelled").length);
        const ab = cs.filter(c => c.is_abandoned).length; const tc = cs.length || 1;
        abandonosPorSemana.push((ab / tc) * 100);
        conversaoPorSemana.push(ps.length > 0 ? (ps.length / tc) * 100 : 0);
      }

      const produtosVendasHistorico: Record<string, number[]> = {};
      for (let i = semanas - 1; i >= 0; i--) {
        const ini = new Date(); ini.setDate(ini.getDate() - (i * 7 + 7));
        const fim = new Date(); fim.setDate(fim.getDate() - (i * 7));
        const ps = orders?.filter(o => { const d = new Date(o.created_at || ""); return d >= ini && d < fim; }) || [];
        const vs: Record<string, number> = {};
        ps.forEach(o => { o.order_items?.forEach(it => { const n = it.product?.name || "Desconhecido"; vs[n] = (vs[n] || 0) + it.quantity; }); });
        Object.keys(vs).forEach(p => { if (!produtosVendasHistorico[p]) produtosVendasHistorico[p] = new Array(semanas).fill(0); produtosVendasHistorico[p][semanas - 1 - i] = vs[p]; });
      }

      const umaSemanaAtras = new Date(); umaSemanaAtras.setDate(umaSemanaAtras.getDate() - 7);
      const pedidosRecentes = orders?.filter(o => new Date(o.created_at || "") >= umaSemanaAtras) || [];
      const cartsRecentes = carts?.filter(c => new Date(c.created_at || "") >= umaSemanaAtras) || [];

      const vendasAtuais: Record<string, number> = {};
      pedidosRecentes.forEach(o => { o.order_items?.forEach(it => { const n = it.product?.name || "Desconhecido"; vendasAtuais[n] = (vendasAtuais[n] || 0) + it.quantity; }); });

      const produtosOrdenados = Object.entries(vendasAtuais).sort((a, b) => b[1] - a[1]);
      const maisVendidos = produtosOrdenados.slice(0, 5).map(([produto, vendas]) => ({ produto, vendas }));
      const menosVendidos = produtosOrdenados.slice(-5).reverse().map(([produto, vendas]) => ({ produto, vendas }));

      const abRec = cartsRecentes.filter(c => c.is_abandoned).length;
      const tcRec = cartsRecentes.length || 1;

      const input: AnalysisInput = {
        historico: { semanas, pedidos: pedidosPorSemana, cancelamentos: cancelamentosPorSemana, abandonos: abandonosPorSemana, conversao: conversaoPorSemana,
          produtos: {
            mais_vendidos: Object.entries(produtosVendasHistorico).map(([produto, vendas]) => ({ produto, vendas })).sort((a, b) => b.vendas.reduce((x, y) => x + y, 0) - a.vendas.reduce((x, y) => x + y, 0)).slice(0, 10),
            menos_vendidos: Object.entries(produtosVendasHistorico).map(([produto, vendas]) => ({ produto, vendas })).sort((a, b) => a.vendas.reduce((x, y) => x + y, 0) - b.vendas.reduce((x, y) => x + y, 0)).slice(0, 10),
          },
        },
        dados_atual: { pedidos_total: pedidosRecentes.length, cancelamentos: pedidosRecentes.filter(o => o.status === "cancelled").length, abandonos: (abRec / tcRec) * 100, conversao: (pedidosRecentes.length / tcRec) * 100, produtos_mais_vendidos: maisVendidos, produtos_menos_vendidos: menosVendidos },
      };

      const resultado = analisarDadosInteligente(input);
      setAnalysis(resultado);
      await salvarPredicoes(user.id, resultado.predicoes);
      await criarAlertas(user.id, resultado.problemas_detectados);
    } catch (err) { console.error("Erro na análise inteligente:", err); setError("Erro ao processar análise"); }
    finally { setLoading(false); }
  };

  const salvarPredicoes = async (restaurantId: string, predicoes: Prediction[]) => {
    try {
      const d = new Date(); d.setDate(d.getDate() + 7);
      await supabase.from("analytics_predictions").insert(predicoes.map(p => ({ restaurant_id: restaurantId, prediction_type: p.tipo, predicted_value: p.valor_previsto, confidence_score: p.confianca, prediction_date: d.toISOString().split('T')[0] })));
    } catch (err) { console.error("Erro ao salvar predições:", err); }
  };

  const criarAlertas = async (restaurantId: string, problemas: Problem[]) => {
    try {
      const criticos = problemas.filter(p => p.gravidade === "crítica" || p.gravidade === "alta");
      if (criticos.length === 0) return;
      await supabase.from("analytics_alerts").insert(criticos.map(p => ({ restaurant_id: restaurantId, alert_type: p.tipo, severity: p.gravidade, title: p.tipo.replace(/_/g, " ").toUpperCase(), message: p.mensagem })));
    } catch (err) { console.error("Erro ao criar alertas:", err); }
  };

  useEffect(() => { fetchAndAnalyze(); }, []);
  return { analysis, loading, error, refetch: fetchAndAnalyze };
}
