import { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  Package, 
  FileText,
  RefreshCw,
  Activity,
  CreditCard,
  Wallet,
  PieChart,
  BarChart3
} from "lucide-react";
import { useFinancialData } from "@/hooks/useFinancialData";
import { FinancialAIChat } from "@/components/finance/FinancialAIChat";
import { ExpensesManager } from "@/components/finance/ExpensesManager";
import { AccountsManager } from "@/components/finance/AccountsManager";
import { InventoryManager } from "@/components/finance/InventoryManager";
import { ProductAnalysisChart } from "@/components/finance/ProductAnalysisChart";

export default function Finance() {
  const { metrics, products, alerts, diagnosis, loading, refetch } = useFinancialData();
  const [activeTab, setActiveTab] = useState("overview");

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'excellent': return 'bg-green-500';
      case 'good': return 'bg-blue-500';
      case 'attention': return 'bg-yellow-500';
      case 'critical': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'excellent': return 'Excelente';
      case 'good': return 'Bom';
      case 'attention': return 'Atenção';
      case 'critical': return 'Crítico';
      default: return status;
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-full">
          <RefreshCw className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold">Gestão Financeira</h1>
            <p className="text-muted-foreground">
              Controle financeiro, estoque e análises inteligentes
            </p>
          </div>
          <Button onClick={refetch} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
        </div>

        {/* Health Score Card */}
        {diagnosis && (
          <Card className="bg-gradient-to-r from-primary/10 to-primary/5">
            <CardContent className="pt-6">
              <div className="flex flex-col md:flex-row items-center gap-6">
                <div className="flex flex-col items-center">
                  <div className="relative w-32 h-32">
                    <svg className="w-full h-full" viewBox="0 0 100 100">
                      <circle
                        className="text-muted stroke-current"
                        strokeWidth="10"
                        fill="transparent"
                        r="40"
                        cx="50"
                        cy="50"
                      />
                      <circle
                        className={`${getStatusColor(diagnosis.status)} stroke-current`}
                        strokeWidth="10"
                        strokeLinecap="round"
                        fill="transparent"
                        r="40"
                        cx="50"
                        cy="50"
                        strokeDasharray={`${diagnosis.score * 2.51} 251`}
                        transform="rotate(-90 50 50)"
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-3xl font-bold">{diagnosis.score}</span>
                      <span className="text-xs text-muted-foreground">de 100</span>
                    </div>
                  </div>
                  <Badge className={`mt-2 ${getStatusColor(diagnosis.status)} text-white`}>
                    {getStatusLabel(diagnosis.status)}
                  </Badge>
                </div>

                <div className="flex-1 space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Financeiro</p>
                      <Progress value={diagnosis.financialHealth} className="mt-1" />
                      <p className="text-sm font-medium mt-1">{diagnosis.financialHealth}%</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Operacional</p>
                      <Progress value={diagnosis.operationalHealth} className="mt-1" />
                      <p className="text-sm font-medium mt-1">{diagnosis.operationalHealth}%</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Estoque</p>
                      <Progress value={diagnosis.inventoryHealth} className="mt-1" />
                      <p className="text-sm font-medium mt-1">{diagnosis.inventoryHealth}%</p>
                    </div>
                  </div>

                  {diagnosis.recommendations.length > 0 && (
                    <div className="bg-background/50 rounded-lg p-3">
                      <p className="text-sm font-medium mb-2">Recomendações Prioritárias:</p>
                      <ul className="space-y-1">
                        {diagnosis.recommendations.slice(0, 3).map((rec, i) => (
                          <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                            <span className="text-primary">•</span> {rec}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Alerts */}
        {alerts.length > 0 && (
          <div className="space-y-2">
            {alerts.map((alert, i) => (
              <Card key={i} className={`border-l-4 ${
                alert.type === 'critical' ? 'border-l-destructive bg-destructive/5' :
                alert.type === 'warning' ? 'border-l-yellow-500 bg-yellow-500/5' :
                'border-l-blue-500 bg-blue-500/5'
              }`}>
                <CardContent className="py-3">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className={`h-5 w-5 mt-0.5 ${
                      alert.type === 'critical' ? 'text-destructive' :
                      alert.type === 'warning' ? 'text-yellow-500' :
                      'text-blue-500'
                    }`} />
                    <div className="flex-1">
                      <p className="font-medium">{alert.title}</p>
                      <p className="text-sm text-muted-foreground">{alert.message}</p>
                      {alert.action && (
                        <p className="text-sm text-primary mt-1">💡 {alert.action}</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* KPI Cards */}
        {metrics && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Receita (30d)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-green-600">
                  R$ {metrics.totalRevenue.toFixed(2)}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <CreditCard className="h-4 w-4" />
                  Despesas (30d)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-red-600">
                  R$ {metrics.totalExpenses.toFixed(2)}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  {metrics.netProfit >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                  Lucro Líquido
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className={`text-2xl font-bold ${metrics.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  R$ {metrics.netProfit.toFixed(2)}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Wallet className="h-4 w-4" />
                  Fluxo de Caixa
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className={`text-2xl font-bold ${metrics.cashFlow >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  R$ {metrics.cashFlow.toFixed(2)}
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Secondary KPIs */}
        {metrics && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-4">
                <p className="text-sm text-muted-foreground">Pedidos (30d)</p>
                <p className="text-xl font-bold">{metrics.totalOrders}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <p className="text-sm text-muted-foreground">Ticket Médio</p>
                <p className="text-xl font-bold">R$ {metrics.avgTicket.toFixed(2)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <p className="text-sm text-muted-foreground">Contas a Pagar</p>
                <p className="text-xl font-bold text-orange-600">R$ {metrics.pendingPayables.toFixed(2)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <p className="text-sm text-muted-foreground">Contas a Receber</p>
                <p className="text-xl font-bold text-blue-600">R$ {metrics.pendingReceivables.toFixed(2)}</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-5 w-full">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <PieChart className="h-4 w-4" />
              <span className="hidden sm:inline">Produtos</span>
            </TabsTrigger>
            <TabsTrigger value="expenses" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">Despesas</span>
            </TabsTrigger>
            <TabsTrigger value="accounts" className="flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              <span className="hidden sm:inline">Contas</span>
            </TabsTrigger>
            <TabsTrigger value="inventory" className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              <span className="hidden sm:inline">Estoque</span>
            </TabsTrigger>
            <TabsTrigger value="ai" className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              <span className="hidden sm:inline">IA</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-6">
            <ProductAnalysisChart products={products} />
          </TabsContent>

          <TabsContent value="expenses" className="mt-6">
            <ExpensesManager />
          </TabsContent>

          <TabsContent value="accounts" className="mt-6">
            <AccountsManager />
          </TabsContent>

          <TabsContent value="inventory" className="mt-6">
            <InventoryManager />
          </TabsContent>

          <TabsContent value="ai" className="mt-6">
            <FinancialAIChat />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
