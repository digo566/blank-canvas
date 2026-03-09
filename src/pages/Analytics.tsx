import { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { OrdersChart } from "@/components/analytics/OrdersChart";
import { CancellationsChart } from "@/components/analytics/CancellationsChart";
import { AbandonmentChart } from "@/components/analytics/AbandonmentChart";
import { PerformanceChart } from "@/components/analytics/PerformanceChart";
import { PredictionsPanel } from "@/components/analytics/PredictionsPanel";
import { AlertsNotification } from "@/components/analytics/AlertsNotification";
import { AnalyticsAIChat } from "@/components/analytics/AnalyticsAIChat";
import { useAnalyticsData } from "@/hooks/useAnalyticsData";
import { useIntelligentAnalytics } from "@/hooks/useIntelligentAnalytics";
import { format, subDays, subWeeks, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { 
  Loader2, 
  TrendingUp, 
  ShoppingCart, 
  XCircle, 
  Package, 
  BarChart3,
  Brain,
  CalendarIcon,
} from "lucide-react";

export default function Analytics() {
  const [period, setPeriod] = useState<"day" | "week" | "month">("week");
  const [dateFrom, setDateFrom] = useState<Date>(subWeeks(new Date(), 1));
  const [dateTo, setDateTo] = useState<Date>(new Date());
  const [activeTab, setActiveTab] = useState<"dashboard" | "ai">("dashboard");

  useEffect(() => {
    const now = new Date();
    if (period === "day") {
      setDateFrom(subDays(now, 1));
      setDateTo(now);
    } else if (period === "week") {
      setDateFrom(subWeeks(now, 1));
      setDateTo(now);
    } else if (period === "month") {
      setDateFrom(subMonths(now, 1));
      setDateTo(now);
    }
  }, [period]);

  const { data, loading, refetch } = useAnalyticsData(dateFrom, dateTo);
  const { analysis, loading: analysisLoading } = useIntelligentAnalytics();

  if (loading || analysisLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-[60vh]">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              Central de Inteligência
            </h1>
            <p className="text-muted-foreground mt-2">
              Analytics, Finanças e IA em um só lugar
            </p>
          </div>
          
          <div className="flex items-center gap-4">
            <AlertsNotification />
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "dashboard" | "ai")} className="w-auto">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="dashboard" className="gap-2">
                  <BarChart3 className="h-4 w-4" />
                  Dashboard
                </TabsTrigger>
                <TabsTrigger value="ai" className="gap-2">
                  <Brain className="h-4 w-4" />
                  IA & Gestão
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>

        {activeTab === "ai" ? (
          <div className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-2">
              <div className="lg:col-span-1">
                <AnalyticsAIChat analyticsData={data} />
              </div>
              <div className="lg:col-span-1 space-y-4">
                <Card className="p-4 bg-gradient-to-br from-background to-muted/30">
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-primary" />
                    Resumo Operacional
                  </h3>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="p-3 bg-muted/30 rounded-lg">
                      <p className="text-muted-foreground">Pedidos</p>
                      <p className="text-xl font-bold">{data?.pedidos_total || 0}</p>
                    </div>
                    <div className="p-3 bg-muted/30 rounded-lg">
                      <p className="text-muted-foreground">Cancelamentos</p>
                      <p className="text-xl font-bold text-destructive">{data?.cancelamentos || 0}</p>
                    </div>
                    <div className="p-3 bg-muted/30 rounded-lg">
                      <p className="text-muted-foreground">Abandono</p>
                      <p className="text-xl font-bold text-orange-500">{data?.abandonos.toFixed(1) || 0}%</p>
                    </div>
                    <div className="p-3 bg-muted/30 rounded-lg">
                      <p className="text-muted-foreground">Produtos Ativos</p>
                      <p className="text-xl font-bold text-green-500">{data?.produtos_mais_vendidos.length || 0}</p>
                    </div>
                  </div>
                </Card>

                <Card className="p-4 bg-gradient-to-br from-background to-muted/30">
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <Package className="h-4 w-4 text-primary" />
                    Top 5 Produtos
                  </h3>
                  <div className="space-y-2">
                    {data?.produtos_mais_vendidos.slice(0, 5).map((p, i) => (
                      <div key={i} className="flex items-center justify-between p-2 bg-muted/30 rounded-lg">
                        <span className="text-sm truncate max-w-[150px]">{p.produto}</span>
                        <span className="text-sm font-medium text-primary">{p.vendas} vendas</span>
                      </div>
                    ))}
                    {(!data?.produtos_mais_vendidos || data.produtos_mais_vendidos.length === 0) && (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        Nenhum produto vendido ainda
                      </p>
                    )}
                  </div>
                </Card>
              </div>
            </div>
          </div>
        ) : (
          <>
            <Card className="p-4 bg-gradient-to-br from-background to-muted/20">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="flex items-center gap-2">
                  <CalendarIcon className="h-5 w-5 text-muted-foreground" />
                  <span className="text-sm font-medium">Período de Análise</span>
                </div>
                
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <div className="flex items-center gap-2">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-[140px] justify-start text-left font-normal",
                            !dateFrom && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {dateFrom ? format(dateFrom, "dd/MM/yyyy", { locale: ptBR }) : "De"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={dateFrom}
                          onSelect={(date) => date && setDateFrom(date)}
                          disabled={(date) => date > dateTo || date > new Date()}
                          initialFocus
                          className="pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                    
                    <span className="text-muted-foreground">até</span>
                    
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-[140px] justify-start text-left font-normal",
                            !dateTo && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {dateTo ? format(dateTo, "dd/MM/yyyy", { locale: ptBR }) : "Até"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={dateTo}
                          onSelect={(date) => date && setDateTo(date)}
                          disabled={(date) => date < dateFrom || date > new Date()}
                          initialFocus
                          className="pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  
                  <Tabs value={period} onValueChange={(v) => setPeriod(v as "day" | "week" | "month")} className="w-auto">
                    <TabsList className="grid w-full grid-cols-3">
                      <TabsTrigger value="day">Dia</TabsTrigger>
                      <TabsTrigger value="week">Semana</TabsTrigger>
                      <TabsTrigger value="month">Mês</TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>
              </div>
              
              <div className="mt-3 text-sm text-muted-foreground flex items-center gap-2">
                <span>Exibindo dados de</span>
                <span className="font-medium text-foreground">
                  {format(dateFrom, "dd 'de' MMMM", { locale: ptBR })}
                </span>
                <span>até</span>
                <span className="font-medium text-foreground">
                  {format(dateTo, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                </span>
              </div>
            </Card>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card className="p-6 bg-gradient-to-br from-background to-muted/30 border-primary/20 hover:border-primary/40 transition-all duration-300 hover:shadow-lg hover:shadow-primary/5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total de Pedidos</p>
                    <p className="text-3xl font-bold mt-2">{data?.pedidos_total || 0}</p>
                  </div>
                  <div className="p-3 bg-primary/10 rounded-xl">
                    <ShoppingCart className="h-6 w-6 text-primary" />
                  </div>
                </div>
              </Card>

              <Card className="p-6 bg-gradient-to-br from-background to-muted/30 border-destructive/20 hover:border-destructive/40 transition-all duration-300 hover:shadow-lg hover:shadow-destructive/5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Cancelamentos</p>
                    <p className="text-3xl font-bold mt-2">{data?.cancelamentos || 0}</p>
                  </div>
                  <div className="p-3 bg-destructive/10 rounded-xl">
                    <XCircle className="h-6 w-6 text-destructive" />
                  </div>
                </div>
              </Card>

              <Card className="p-6 bg-gradient-to-br from-background to-muted/30 border-orange-500/20 hover:border-orange-500/40 transition-all duration-300 hover:shadow-lg hover:shadow-orange-500/5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Taxa de Abandono</p>
                    <p className="text-3xl font-bold mt-2">{data?.abandonos.toFixed(1) || 0}%</p>
                  </div>
                  <div className="p-3 bg-orange-500/10 rounded-xl">
                    <TrendingUp className="h-6 w-6 text-orange-500" />
                  </div>
                </div>
              </Card>

              <Card className="p-6 bg-gradient-to-br from-background to-muted/30 border-green-500/20 hover:border-green-500/40 transition-all duration-300 hover:shadow-lg hover:shadow-green-500/5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Produtos Vendidos</p>
                    <p className="text-3xl font-bold mt-2 text-green-500">
                      {data?.produtos_mais_vendidos.length || 0}
                    </p>
                  </div>
                  <div className="p-3 bg-green-500/10 rounded-xl">
                    <Package className="h-6 w-6 text-green-500" />
                  </div>
                </div>
              </Card>
            </div>

            {analysis && (
              <div className="space-y-6">
                <PredictionsPanel predicoes={analysis.predicoes} />
                
                <div className="relative">
                  <InsightsPanel
                    problemas={analysis.problemas_detectados}
                    sugestoes={analysis.sugestoes_personalizadas}
                  />
                  {analysis.sugestoes_personalizadas.length > 0 && (
                    <div className="flex justify-end mt-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setFeedbackDialog({
                            open: true,
                            suggestion: analysis.sugestoes_personalizadas[0],
                            type: "sugestao_geral",
                          })
                        }
                      >
                        <MessageSquare className="h-4 w-4 mr-2" />
                        Avaliar Sugestões
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="grid gap-6 lg:grid-cols-2">
              <Card className="p-6 bg-gradient-to-br from-background to-muted/20 border-muted">
                <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                  Pedidos por Período
                </h3>
                <OrdersChart 
                  data={data?.pedidos_por_dia || []} 
                  period={period} 
                  labels={data?.pedidos_por_dia_labels}
                />
              </Card>

              <Card className="p-6 bg-gradient-to-br from-background to-muted/20 border-muted">
                <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-destructive animate-pulse" />
                  Cancelamentos
                </h3>
                <CancellationsChart data={data?.cancelamentos || 0} total={data?.pedidos_total || 0} />
              </Card>

              <Card className="p-6 bg-gradient-to-br from-background to-muted/20 border-muted">
                <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-orange-500 animate-pulse" />
                  Taxa de Abandono de Carrinho
                </h3>
                <AbandonmentChart rate={data?.abandonos || 0} />
              </Card>

              <Card className="p-6 bg-gradient-to-br from-background to-muted/20 border-muted">
                <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                  Desempenho Geral
                </h3>
                <PerformanceChart data={data} />
              </Card>
            </div>

            <FeedbackDialog
              open={feedbackDialog.open}
              onOpenChange={(open) => setFeedbackDialog((prev) => ({ ...prev, open }))}
              suggestion={feedbackDialog.suggestion}
              suggestionType={feedbackDialog.type}
            />
          </>
        )}
      </div>
    </DashboardLayout>
  );
}