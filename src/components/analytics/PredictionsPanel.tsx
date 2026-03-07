import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Minus, Calendar } from "lucide-react";
import { Prediction } from "@/lib/analytics/predictions";

export function PredictionsPanel({ predicoes }: { predicoes: Prediction[] }) {
  const getIcon = (t: string) => t === "alta" ? <TrendingUp className="h-4 w-4 text-green-500" /> : t === "baixa" ? <TrendingDown className="h-4 w-4 text-destructive" /> : <Minus className="h-4 w-4 text-muted-foreground" />;
  const getColor = (t: string) => t === "alta" ? "text-green-500" : t === "baixa" ? "text-destructive" : "text-muted-foreground";
  const formatTipo = (t: string) => ({ pedidos: "Pedidos", cancelamentos: "Cancelamentos", abandonos: "Taxa de Abandono", conversao: "Taxa de Conversão" }[t] || t);
  const formatValor = (t: string, v: number) => (t === "abandonos" || t === "conversao") ? `${v.toFixed(1)}%` : Math.round(v).toString();

  return (
    <Card><CardHeader><CardTitle className="flex items-center gap-2"><Calendar className="h-5 w-5" />Predições para Próximos 7 Dias</CardTitle><CardDescription>Previsões baseadas em análise de tendências</CardDescription></CardHeader>
      <CardContent><div className="grid gap-4 md:grid-cols-2">{predicoes.map((p, i) => (
        <div key={i} className="flex flex-col p-4 rounded-lg border bg-card space-y-3">
          <div className="flex items-center justify-between"><span className="font-medium">{formatTipo(p.tipo)}</span><div className="flex items-center gap-1">{getIcon(p.tendencia)}<span className={`text-sm font-medium ${getColor(p.tendencia)}`}>{p.tendencia}</span></div></div>
          <div className="flex items-baseline gap-2"><span className="text-3xl font-bold">{formatValor(p.tipo, p.valor_previsto)}</span><span className="text-sm text-muted-foreground">em 7 dias</span></div>
          <div className="flex items-center justify-between pt-2 border-t"><span className="text-xs text-muted-foreground">Confiança</span><Badge variant={p.confianca >= 80 ? "default" : p.confianca >= 60 ? "secondary" : "outline"}>{p.confianca}%</Badge></div>
        </div>
      ))}</div></CardContent></Card>
  );
}
