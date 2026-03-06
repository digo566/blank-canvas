import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
} from "recharts";
import { Loader2 } from "lucide-react";

interface BCGProduct {
  name: string;
  salesGrowth: number; // Y-axis: growth rate
  marketShare: number; // X-axis: relative sales volume
  revenue: number;
  profit: number;
  margin: number;
  category: "star" | "cash_cow" | "question_mark" | "dog";
}

const categoryColors: Record<string, string> = {
  star: "#facc15",       // yellow
  cash_cow: "#22c55e",   // green
  question_mark: "#3b82f6", // blue
  dog: "#ef4444",        // red
};

const categoryLabels: Record<string, string> = {
  star: "⭐ Estrela",
  cash_cow: "🐄 Vaca Leiteira",
  question_mark: "❓ Interrogação",
  dog: "🐶 Abacaxi",
};

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload?.[0]) {
    const data = payload[0].payload as BCGProduct;
    return (
      <div className="bg-background border border-border rounded-lg p-3 shadow-lg">
        <p className="font-semibold text-sm">{data.name}</p>
        <p className="text-xs text-muted-foreground">{categoryLabels[data.category]}</p>
        <div className="mt-2 space-y-1 text-xs">
          <p>📈 Crescimento: {data.salesGrowth.toFixed(1)}%</p>
          <p>📊 Vol. Vendas: {data.marketShare.toFixed(0)}</p>
          <p>💰 Receita: R$ {data.revenue.toFixed(2)}</p>
          <p>💵 Lucro: R$ {data.profit.toFixed(2)}</p>
          <p>📉 Margem: {data.margin.toFixed(1)}%</p>
        </div>
      </div>
    );
  }
  return null;
};

export function BCGMatrixChart() {
  const [products, setProducts] = useState<BCGProduct[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadBCGData();
  }, []);

  const loadBCGData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

      // Current period orders
      const { data: currentOrders } = await supabase
        .from("orders")
        .select("order_items(quantity, subtotal, product:products(name, cost_price, price))")
        .eq("restaurant_id", user.id)
        .gte("created_at", thirtyDaysAgo.toISOString())
        .neq("status", "cancelled");

      // Previous period orders
      const { data: prevOrders } = await supabase
        .from("orders")
        .select("order_items(quantity, subtotal, product:products(name, cost_price, price))")
        .eq("restaurant_id", user.id)
        .gte("created_at", sixtyDaysAgo.toISOString())
        .lt("created_at", thirtyDaysAgo.toISOString())
        .neq("status", "cancelled");

      // Aggregate current period
      const currentMap: Record<string, { qty: number; revenue: number; cost: number }> = {};
      currentOrders?.forEach((order: any) => {
        order.order_items?.forEach((item: any) => {
          const name = item.product?.name || "Desconhecido";
          if (!currentMap[name]) currentMap[name] = { qty: 0, revenue: 0, cost: 0 };
          currentMap[name].qty += item.quantity;
          currentMap[name].revenue += item.subtotal || 0;
          currentMap[name].cost += (item.product?.cost_price || 0) * item.quantity;
        });
      });

      // Aggregate previous period
      const prevMap: Record<string, number> = {};
      prevOrders?.forEach((order: any) => {
        order.order_items?.forEach((item: any) => {
          const name = item.product?.name || "Desconhecido";
          prevMap[name] = (prevMap[name] || 0) + item.quantity;
        });
      });

      // Calculate BCG metrics
      const totalCurrentQty = Object.values(currentMap).reduce((s, d) => s + d.qty, 0) || 1;
      const avgGrowth = Object.keys(currentMap).length > 0
        ? Object.entries(currentMap).reduce((sum, [name, d]) => {
            const prevQty = prevMap[name] || 0;
            return sum + (prevQty > 0 ? ((d.qty - prevQty) / prevQty) * 100 : 0);
          }, 0) / Object.keys(currentMap).length
        : 0;
      const avgShare = totalCurrentQty / (Object.keys(currentMap).length || 1);

      const bcgProducts: BCGProduct[] = Object.entries(currentMap).map(([name, d]) => {
        const prevQty = prevMap[name] || 0;
        const growth = prevQty > 0 ? ((d.qty - prevQty) / prevQty) * 100 : (d.qty > 0 ? 50 : 0);
        const share = d.qty;
        const profit = d.revenue - d.cost;
        const margin = d.revenue > 0 ? (profit / d.revenue) * 100 : 0;

        let category: BCGProduct["category"];
        if (growth > avgGrowth && share > avgShare) category = "star";
        else if (growth <= avgGrowth && share > avgShare) category = "cash_cow";
        else if (growth > avgGrowth && share <= avgShare) category = "question_mark";
        else category = "dog";

        return { name, salesGrowth: growth, marketShare: share, revenue: d.revenue, profit, margin, category };
      });

      setProducts(bcgProducts);
    } catch (error) {
      console.error("Erro ao carregar dados BCG:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      </Card>
    );
  }

  if (products.length === 0) {
    return (
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-2">Matriz BCG</h3>
        <p className="text-sm text-muted-foreground">Sem dados suficientes para gerar a matriz.</p>
      </Card>
    );
  }

  const avgGrowth = products.reduce((s, p) => s + p.salesGrowth, 0) / products.length;
  const avgShare = products.reduce((s, p) => s + p.marketShare, 0) / products.length;

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-1">Matriz BCG — Performance de Produtos</h3>
      <p className="text-sm text-muted-foreground mb-4">
        Crescimento vs Volume de Vendas (últimos 30 dias vs período anterior)
      </p>

      <ResponsiveContainer width="100%" height={350}>
        <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
          <XAxis
            type="number"
            dataKey="marketShare"
            name="Volume de Vendas"
            label={{ value: "Volume de Vendas", position: "bottom", offset: 0, style: { fontSize: 12 } }}
          />
          <YAxis
            type="number"
            dataKey="salesGrowth"
            name="Crescimento (%)"
            label={{ value: "Crescimento (%)", angle: -90, position: "insideLeft", style: { fontSize: 12 } }}
          />
          <ReferenceLine x={avgShare} stroke="hsl(var(--muted-foreground))" strokeDasharray="5 5" opacity={0.5} />
          <ReferenceLine y={avgGrowth} stroke="hsl(var(--muted-foreground))" strokeDasharray="5 5" opacity={0.5} />
          <Tooltip content={<CustomTooltip />} />
          <Scatter data={products}>
            {products.map((product, index) => (
              <Cell key={index} fill={categoryColors[product.category]} r={8} />
            ))}
          </Scatter>
        </ScatterChart>
      </ResponsiveContainer>

      <div className="flex flex-wrap gap-3 mt-4 justify-center">
        {Object.entries(categoryLabels).map(([key, label]) => (
          <div key={key} className="flex items-center gap-2 text-xs">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: categoryColors[key] }} />
            <span>{label}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}
