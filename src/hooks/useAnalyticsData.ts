import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { startOfDay, endOfDay, eachDayOfInterval, format } from "date-fns";

export interface ProductProfitability {
  produto: string;
  vendas: number;
  receita: number;
  custo: number;
  lucro: number;
  margem: number;
}

export interface AnalyticsData {
  pedidos_total: number;
  pedidos_por_dia: number[];
  pedidos_por_dia_labels: string[];
  cancelamentos: number;
  abandonos: number;
  produtos_mais_vendidos: Array<{ produto: string; vendas: number }>;
  produtos_menos_vendidos: Array<{ produto: string; vendas: number }>;
  produtos_mais_lucrativos: ProductProfitability[];
  produtos_menos_lucrativos: ProductProfitability[];
  periodo: {
    de: string;
    ate: string;
  };
}

export function useAnalyticsData(dateFrom?: Date, dateTo?: Date) {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const from = dateFrom ? startOfDay(dateFrom) : startOfDay(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000));
      const to = dateTo ? endOfDay(dateTo) : endOfDay(new Date());

      // Fetch orders within date range
      const [ordersResult, productsResult] = await Promise.all([
        supabase
          .from("orders")
          .select("*, order_items(*, product:products(name))")
          .eq("restaurant_id", user.id)
          .gte("created_at", from.toISOString())
          .lte("created_at", to.toISOString()),
        supabase
          .from("products")
          .select("id, name, price, cost_price")
          .eq("restaurant_id", user.id),
      ]);

      const orders = ordersResult.data;
      const allProducts = productsResult.data || [];
      
      // Build cost lookup from current product data
      const productCostMap: Record<string, { price: number; cost_price: number }> = {};
      allProducts.forEach(p => {
        productCostMap[p.name] = { price: p.price, cost_price: p.cost_price || 0 };
      });

      // Calculate metrics
      const pedidos_total = orders?.length || 0;
      const cancelamentos = orders?.filter(o => o.status === "cancelled").length || 0;

      // Orders by day for the selected period
      const daysInRange = eachDayOfInterval({ start: from, end: to });
      const pedidos_por_dia: number[] = [];
      const pedidos_por_dia_labels: string[] = [];

      daysInRange.forEach(day => {
        const dayStart = startOfDay(day);
        const dayEnd = endOfDay(day);
        
        const ordersInDay = orders?.filter(o => {
          const orderDate = new Date(o.created_at || "");
          return orderDate >= dayStart && orderDate <= dayEnd;
        }).length || 0;
        
        pedidos_por_dia.push(ordersInDay);
        pedidos_por_dia_labels.push(format(day, "dd/MM"));
      });

      // Cart abandonment rate within date range
      const { data: carts } = await supabase
        .from("carts")
        .select("*")
        .eq("restaurant_id", user.id)
        .gte("created_at", from.toISOString())
        .lte("created_at", to.toISOString());

      const abandonedCarts = carts?.filter(c => c.is_abandoned).length || 0;
      const totalCarts = carts?.length || 1;
      const abandonos = (abandonedCarts / totalCarts) * 100;

      // Top and bottom products within date range
      const productSales: Record<string, number> = {};
      const productProfit: Record<string, { vendas: number; receita: number; custo: number }> = {};
      
       orders?.forEach(order => {
        if (order.status === "cancelled") return;
        order.order_items?.forEach(item => {
          const productName = item.product?.name || "Produto Desconhecido";
          const costData = productCostMap[productName];
          const costPrice = costData?.cost_price || 0;
          
          productSales[productName] = (productSales[productName] || 0) + item.quantity;
          
          if (!productProfit[productName]) {
            productProfit[productName] = { vendas: 0, receita: 0, custo: 0 };
          }
          productProfit[productName].vendas += item.quantity;
          productProfit[productName].receita += item.subtotal || (item.unit_price * item.quantity);
          productProfit[productName].custo += costPrice * item.quantity;
        });
      });

      const sortedProducts = Object.entries(productSales)
        .map(([produto, vendas]) => ({ produto, vendas }))
        .sort((a, b) => b.vendas - a.vendas);

      const produtos_mais_vendidos = sortedProducts.slice(0, 5);
      const produtos_menos_vendidos = sortedProducts.slice(-5).reverse();

      // Profitability ranking - include ALL products with sales
      const profitabilityList: ProductProfitability[] = Object.entries(productProfit)
        .map(([produto, d]) => ({
          produto,
          vendas: d.vendas,
          receita: d.receita,
          custo: d.custo,
          lucro: d.custo > 0 ? d.receita - d.custo : d.receita,
          margem: d.receita > 0 && d.custo > 0 ? ((d.receita - d.custo) / d.receita) * 100 : -1,
        }));

      // Most profitable: products with cost get real margin, others sorted by revenue
      const produtos_mais_lucrativos = [...profitabilityList]
        .sort((a, b) => {
          // Products with cost data come first
          if (a.custo > 0 && b.custo <= 0) return -1;
          if (a.custo <= 0 && b.custo > 0) return 1;
          // Both have cost: sort by profit
          if (a.custo > 0 && b.custo > 0) return b.lucro - a.lucro || b.vendas - a.vendas;
          // Neither has cost: sort by revenue
          return b.receita - a.receita;
        })
        .slice(0, 5);

      // Least profitable: lowest margin first (only makes sense with cost data), then by volume
      const produtos_menos_lucrativos = [...profitabilityList]
        .sort((a, b) => {
          if (a.custo > 0 && b.custo <= 0) return -1;
          if (a.custo <= 0 && b.custo > 0) return 1;
          if (a.custo > 0 && b.custo > 0) return a.margem - b.margem || b.vendas - a.vendas;
          return b.receita - a.receita;
        })
        .slice(0, 5);

      setData({
        pedidos_total,
        pedidos_por_dia,
        pedidos_por_dia_labels,
        cancelamentos,
        abandonos,
        produtos_mais_vendidos,
        produtos_menos_vendidos,
        produtos_mais_lucrativos,
        produtos_menos_lucrativos,
        periodo: {
          de: from.toISOString(),
          ate: to.toISOString(),
        },
      });
    } catch (error) {
      console.error("Error fetching analytics:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [dateFrom?.toISOString(), dateTo?.toISOString()]);

  return { data, loading, refetch: fetchData };
}
