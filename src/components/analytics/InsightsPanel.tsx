import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, TrendingUp, TrendingDown, AlertCircle, CheckCircle2 } from "lucide-react";
import { Problem } from "@/lib/analytics/types";

interface InsightsPanelProps {
  problemas: Problem[];
  sugestoes: string[];
}

export function InsightsPanel({ problemas, sugestoes }: InsightsPanelProps) {
  const getSeverityColor = (gravidade: string) => {
    switch (gravidade) {
      case "crítica": return "destructive";
      case "alta": return "destructive";
      case "média": return "default";
      case "baixa": return "secondary";
      default: return "secondary";
    }
  };

  const getSeverityIcon = (gravidade: string) => {
    switch (gravidade) {
      case "crítica": return <AlertTriangle className="h-5 w-5" />;
      case "alta": return <AlertCircle className="h-5 w-5" />;
      case "média": return <TrendingDown className="h-5 w-5" />;
      case "baixa": return <TrendingUp className="h-5 w-5" />;
      default: return <AlertCircle className="h-5 w-5" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Problemas Detectados */}
      {problemas.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Problemas Detectados
            </CardTitle>
            <CardDescription>
              Alertas baseados no comportamento histórico do seu restaurante
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {problemas.map((problema, index) => (
              <Alert key={index} variant={problema.gravidade === "crítica" || problema.gravidade === "alta" ? "destructive" : "default"}>
                <div className="flex items-start gap-3">
                  {getSeverityIcon(problema.gravidade)}
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <AlertTitle className="mb-0">{problema.mensagem}</AlertTitle>
                      <Badge variant={getSeverityColor(problema.gravidade)}>
                        {problema.gravidade}
                      </Badge>
                    </div>
                    <AlertDescription>
                      <strong>Sugestão:</strong> {problema.sugestao}
                    </AlertDescription>
                    {problema.impacto_estimado && (
                      <AlertDescription className="text-xs">
                        <strong>Impacto:</strong> {problema.impacto_estimado}
                      </AlertDescription>
                    )}
                  </div>
                </div>
              </Alert>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Sugestões Personalizadas */}
      {sugestoes.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              Sugestões Personalizadas
            </CardTitle>
            <CardDescription>
              Recomendações baseadas no aprendizado contínuo do seu negócio
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {sugestoes.map((sugestao, index) => (
                <li key={index} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                  <TrendingUp className="h-5 w-5 text-primary mt-0.5" />
                  <span className="text-sm">{sugestao}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {problemas.length === 0 && sugestoes.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <CheckCircle2 className="h-12 w-12 text-green-500 mb-4" />
            <p className="text-lg font-medium">Tudo está funcionando bem!</p>
            <p className="text-sm text-muted-foreground mt-2">
              Nenhum problema detectado no momento.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
