import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, TrendingUp, TrendingDown, AlertCircle, CheckCircle2 } from "lucide-react";
import { Problem } from "@/lib/analytics/types";

interface InsightsPanelProps { problemas: Problem[]; sugestoes: string[]; }

export function InsightsPanel({ problemas, sugestoes }: InsightsPanelProps) {
  const getIcon = (g: string) => { switch (g) { case "crítica": return <AlertTriangle className="h-5 w-5" />; case "alta": return <AlertCircle className="h-5 w-5" />; case "média": return <TrendingDown className="h-5 w-5" />; default: return <TrendingUp className="h-5 w-5" />; } };
  const getColor = (g: string) => (g === "crítica" || g === "alta") ? "destructive" as const : g === "média" ? "default" as const : "secondary" as const;

  return (
    <div className="space-y-6">
      {problemas.length > 0 && (
        <Card><CardHeader><CardTitle className="flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-destructive" />Problemas Detectados</CardTitle><CardDescription>Alertas baseados no comportamento histórico</CardDescription></CardHeader>
          <CardContent className="space-y-4">{problemas.map((p, i) => (
            <Alert key={i} variant={p.gravidade === "crítica" || p.gravidade === "alta" ? "destructive" : "default"}>
              <div className="flex items-start gap-3">{getIcon(p.gravidade)}<div className="flex-1 space-y-2"><div className="flex items-center gap-2"><AlertTitle className="mb-0">{p.mensagem}</AlertTitle><Badge variant={getColor(p.gravidade)}>{p.gravidade}</Badge></div><AlertDescription><strong>Sugestão:</strong> {p.sugestao}</AlertDescription></div></div>
            </Alert>
          ))}</CardContent></Card>
      )}
      {sugestoes.length > 0 && (
        <Card><CardHeader><CardTitle className="flex items-center gap-2"><CheckCircle2 className="h-5 w-5 text-green-500" />Sugestões Personalizadas</CardTitle></CardHeader>
          <CardContent><ul className="space-y-3">{sugestoes.map((s, i) => <li key={i} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50"><TrendingUp className="h-5 w-5 text-primary mt-0.5" /><span className="text-sm">{s}</span></li>)}</ul></CardContent></Card>
      )}
      {problemas.length === 0 && sugestoes.length === 0 && <Card><CardContent className="flex flex-col items-center justify-center py-12"><CheckCircle2 className="h-12 w-12 text-green-500 mb-4" /><p className="text-lg font-medium">Tudo está funcionando bem!</p></CardContent></Card>}
    </div>
  );
}
