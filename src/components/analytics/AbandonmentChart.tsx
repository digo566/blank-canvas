import { TrendingUp, TrendingDown } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

export function AbandonmentChart({ rate }: { rate: number }) {
  const isGood = rate <= 20;
  const isWarning = rate > 20 && rate <= 35;
  const isBad = rate > 35;

  const getStatusColor = () => {
    if (isGood) return "text-primary";
    if (isWarning) return "text-yellow-600";
    return "text-destructive";
  };

  const getProgressColor = () => {
    if (isGood) return "bg-primary";
    if (isWarning) return "bg-yellow-600";
    return "bg-destructive";
  };

  const getStatusText = () => {
    if (isGood) return "Excelente";
    if (isWarning) return "Atenção";
    return "Crítico";
  };

  return (
    <div className="w-full h-[400px] flex items-center justify-center">
      <Card className="w-full max-w-md">
        <CardContent className="p-8">
          <div className="text-center space-y-6">
            <div className="space-y-2">
              <div className="flex items-center justify-center gap-2">
                {isGood ? (
                  <TrendingDown className="h-6 w-6 text-primary" />
                ) : (
                  <TrendingUp className="h-6 w-6 text-destructive" />
                )}
                <h3 className="text-sm font-medium text-muted-foreground">
                  Taxa de Abandono
                </h3>
              </div>
              <p className={`text-6xl font-bold ${getStatusColor()}`}>
                {rate.toFixed(1)}%
              </p>
              <p className={`text-sm font-medium ${getStatusColor()}`}>
                {getStatusText()}
              </p>
            </div>

            <div className="space-y-2">
              <Progress value={Math.min(rate, 100)} className="h-3" />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>0%</span>
                <span className="text-primary">20% (meta)</span>
                <span className="text-yellow-600">35%</span>
                <span>100%</span>
              </div>
            </div>

            <div className="pt-4 space-y-2 text-sm text-muted-foreground">
              <p className="font-medium">Benchmark:</p>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div className="p-2 bg-primary/10 rounded">
                  <p className="font-semibold text-primary">≤ 20%</p>
                  <p>Ótimo</p>
                </div>
                <div className="p-2 bg-yellow-500/10 rounded">
                  <p className="font-semibold text-yellow-600">21-35%</p>
                  <p>Normal</p>
                </div>
                <div className="p-2 bg-destructive/10 rounded">
                  <p className="font-semibold text-destructive">&gt; 35%</p>
                  <p>Atenção</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
