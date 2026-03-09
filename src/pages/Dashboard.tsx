import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DollarSign, Package, ShoppingBag, TrendingUp, ExternalLink, Copy, Star, MessageCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface DashboardStats {
  totalOrders: number;
  totalRevenue: number;
  averageTicket: number;
  topProduct: string;
  estimatedProfit: number;
  totalCosts: number;
  starProducts: Array<{ name: string; margin: number; revenue: number }>;
}

const Dashboard = () => {
  const [stats, setStats] = useState<DashboardStats>({
    totalOrders: 0,
    totalRevenue: 0,
    averageTicket: 0,
    topProduct: "N/A",
    estimatedProfit: 0,
    totalCosts: 0,
    starProducts: [],
  });
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string>("");

  const storeUrl = `${window.location.origin}/r/${userId}`;
  const chatUrl = `${window.location.origin}/chat/${userId}`;

  const copyStoreUrl = () => {
    navigator.clipboard.writeText(storeUrl);
    toast.success("Link da loja copiado!");
  };

  const copyChatUrl = () => {
    navigator.clipboard.writeText(chatUrl);
    toast.success("Link do atendente copiado!");
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      setUserId(user.id);

      // Fetch recent orders only (last 90 days) for performance
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

      const { data: allOrders, error: statsError } = await supabase
        .from("orders")
        .select("total_amount, order_items(quantity, unit_price, product:products(name, cost_price, price, profit_margin))")
        .eq("restaurant_id", user.id)
        .neq("status", "cancelled")
        .gte("created_at", ninetyDaysAgo.toISOString());

      if (statsError) throw statsError;

      const { data: orders, error: ordersError } = await supabase
        .from("orders")
        .select("*, clients(name), order_items(quantity, product_id, products(name))")
        .eq("restaurant_id", user.id)
        .order("created_at", { ascending: false })
        .limit(5);

      if (ordersError) throw ordersError;

      const totalOrders = allOrders?.length || 0;
      const totalRevenue = allOrders?.reduce((sum, order) => sum + Number(order.total_amount), 0) || 0;
      const averageTicket = totalOrders > 0 ? totalRevenue / totalOrders : 0;

      // Calculate costs and profit
      let totalCosts = 0;
      const productPerf: Record<string, { revenue: number; cost: number; margin: number }> = {};
      
      allOrders?.forEach((order: any) => {
        order.order_items?.forEach((item: any) => {
          const costPrice = item.product?.cost_price || 0;
          const sellPrice = item.unit_price || item.product?.price || 0;
          const qty = item.quantity || 1;
          totalCosts += costPrice * qty;
          
          const name = item.product?.name || "Desconhecido";
          if (!productPerf[name]) productPerf[name] = { revenue: 0, cost: 0, margin: 0 };
          productPerf[name].revenue += sellPrice * qty;
          productPerf[name].cost += costPrice * qty;
        });
      });

      const estimatedProfit = totalRevenue - totalCosts;
      
      const starProducts = Object.entries(productPerf)
        .map(([name, d]) => ({
          name,
          revenue: d.revenue,
          margin: d.revenue > 0 ? ((d.revenue - d.cost) / d.revenue) * 100 : 0,
        }))
        .filter(p => p.margin >= 50)
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5);

      // Find top product
      const topProductEntry = Object.entries(productPerf).sort((a, b) => b[1].revenue - a[1].revenue)[0];

      setStats({
        totalOrders,
        totalRevenue,
        averageTicket,
        topProduct: topProductEntry ? topProductEntry[0] : "N/A",
        estimatedProfit,
        totalCosts,
        starProducts,
      });

      setRecentOrders(orders || []);
    } catch (error: unknown) {
      console.error("Dashboard error:", error);
      toast.error("Erro ao carregar dados do dashboard");
    } finally {
      setLoading(false);
    }
  };

  const statusColors: Record<string, string> = {
    pending: "bg-amber-100 text-amber-800 border-amber-200",
    preparing: "bg-blue-100 text-blue-800 border-blue-200",
    ready: "bg-green-100 text-green-800 border-green-200",
    delivered: "bg-muted text-muted-foreground",
    cancelled: "bg-red-100 text-red-800 border-red-200",
    on_the_way: "bg-purple-100 text-purple-800 border-purple-200",
  };

  const statusLabels: Record<string, string> = {
    pending: "Pendente",
    preparing: "Em Preparo",
    ready: "Pronto",
    delivered: "Entregue",
    cancelled: "Cancelado",
    on_the_way: "A Caminho",
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground text-sm">Visão geral do seu negócio</p>
        </div>

        {/* Store Link Card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <ExternalLink className="w-4 h-4 text-primary" />
              Link da Sua Loja
            </CardTitle>
            <CardDescription>Compartilhe com seus clientes</CardDescription>
          </CardHeader>
          <CardContent className="flex gap-2">
            <Input value={storeUrl} readOnly className="font-mono text-sm" />
            <Button onClick={copyStoreUrl} variant="outline" size="icon">
              <Copy className="w-4 h-4" />
            </Button>
            <Button onClick={() => window.open(storeUrl, "_blank")}>
              Abrir
            </Button>
          </CardContent>
        </Card>

        {/* AI Attendant Link Card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <MessageCircle className="w-4 h-4 text-primary" />
              Link do Atendente Virtual
            </CardTitle>
            <CardDescription>Envie para seus clientes fazerem pedidos via chat com IA</CardDescription>
          </CardHeader>
          <CardContent className="flex gap-2">
            <Input value={chatUrl} readOnly className="font-mono text-sm" />
            <Button onClick={copyChatUrl} variant="outline" size="icon">
              <Copy className="w-4 h-4" />
            </Button>
            <Button onClick={() => window.open(chatUrl, "_blank")}>
              Abrir
            </Button>
          </CardContent>
        </Card>

        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total de Pedidos</CardTitle>
              <ShoppingBag className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold">{stats.totalOrders}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Faturamento Bruto</CardTitle>
              <DollarSign className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold">
                R$ {stats.totalRevenue.toFixed(2)}
              </div>
            </CardContent>
          </Card>

          <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-background">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Lucro Líquido Est.</CardTitle>
              <TrendingUp className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-semibold ${stats.estimatedProfit >= 0 ? 'text-green-600' : 'text-destructive'}`}>
                R$ {stats.estimatedProfit.toFixed(2)}
              </div>
              {stats.totalRevenue > 0 && (
                <p className="text-xs text-muted-foreground mt-1">
                  Margem: {((stats.estimatedProfit / stats.totalRevenue) * 100).toFixed(1)}%
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Ticket Médio</CardTitle>
              <DollarSign className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold">
                R$ {stats.averageTicket.toFixed(2)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Top Produto</CardTitle>
              <Package className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-lg font-semibold truncate">{stats.topProduct}</div>
            </CardContent>
          </Card>
        </div>

        {/* Star Products */}
        {stats.starProducts.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Star className="w-4 h-4 text-yellow-500" />
                Produtos Estrela (Margem ≥ 50%)
              </CardTitle>
              <CardDescription>Seus produtos mais lucrativos</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {stats.starProducts.map((p, i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-md bg-yellow-500/5 border border-yellow-500/20">
                    <div>
                      <p className="font-medium text-sm">{p.name} ⭐</p>
                      <p className="text-xs text-muted-foreground">R$ {p.revenue.toFixed(2)} em vendas</p>
                    </div>
                    <Badge variant="outline" className="text-green-600 border-green-600/30">
                      {p.margin.toFixed(0)}%
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Recent Orders */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Pedidos Recentes</CardTitle>
            <CardDescription>Últimos 5 pedidos</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentOrders.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <ShoppingBag className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">Nenhum pedido ainda</p>
                </div>
              ) : (
                recentOrders.map((order) => (
                  <div
                    key={order.id}
                    className="flex items-center justify-between p-3 rounded-md bg-secondary/50"
                  >
                    <div>
                      <p className="font-medium text-sm">{order.clients?.name || "Cliente não identificado"}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(order.created_at).toLocaleDateString("pt-BR")}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <p className="font-semibold">R$ {parseFloat(order.total_amount).toFixed(2)}</p>
                      <Badge variant="outline" className={statusColors[order.status]}>
                        {statusLabels[order.status]}
                      </Badge>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;