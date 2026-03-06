import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Minus, Calendar } from "lucide-react";
import { Prediction } from "@/lib/analytics/predictions";

interface PredictionsPanelProps {
  predicoes: Prediction[];
}

export function PredictionsPanel({ predicoes }: PredictionsPanelProps) {
  const getTrendIcon = (tendencia: string) => {
    switch (tendencia) {
      case "alta": return <TrendingUp className="h-4 w-4 text-green-500" />;
      case "baixa": return <TrendingDown className="h-4 w-4 text-destructive" />;
      default: return <Minus className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getTrendColor = (tendencia: string) => {
    switch (tendencia) {
      case "alta": return "text-green-500";
      case "baixa": return "text-destructive";
      default: return "text-muted-foreground";
    }
  };

  const formatTipo = (tipo: string) => {
    const map: Record<string, string> = {
      pedidos: "Pedidos",
      cancelamentos: "Cancelamentos",
      abandonos: "Taxa de Abandono",
      conversao: "Taxa de Conversão"
    };
    return map[tipo] || tipo;
  };

  const formatValor = (tipo: string, valor: number) => {
    if (tipo === "abandonos" || tipo === "conversao") {
      return `${valor.toFixed(1)}%`;
    }
    return Math.round(valor).toString();
  };

  const getConfidenceColor = (confianca: number) => {
    if (confianca >= 80) return "default";
    if (confianca >= 60) return "secondary";
    return "outline";
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Predições para Próximos 7 Dias
        </CardTitle>
        <CardDescription>
          Previsões baseadas em machine learning e análise de tendências
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-2">
          {predicoes.map((predicao, index) => (
            <div
              key={index}
              className="flex flex-col p-4 rounded-lg border bg-card space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className="font-medium">{formatTipo(predicao.tipo)}</span>
                <div className="flex items-center gap-1">
                  {getTrendIcon(predicao.tendencia)}
                  <span className={`text-sm font-medium ${getTrendColor(predicao.tendencia)}`}>
                    {predicao.tendencia}
                  </span>
                </div>
              </div>
              
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold">
                  {formatValor(predicao.tipo, predicao.valor_previsto)}
                </span>
                <span className="text-sm text-muted-foreground">
                  em 7 dias
                </span>
              </div>

              <div className="flex items-center justify-between pt-2 border-t">
                <span className="text-xs text-muted-foreground">Confiança</span>
                <Badge variant={getConfidenceColor(predicao.confianca)}>
                  {predicao.confianca}%
                </Badge>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
