import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell
} from "recharts";
import type { ProductAnalysis } from "@/lib/finance/types";

interface ProductAnalysisChartProps {
  products: ProductAnalysis[];
}

export function ProductAnalysisChart({ products }: ProductAnalysisChartProps) {
  const topProducts = products.slice(0, 10);
  const lowMarginProducts = products.filter(p => p.margin < 30 && p.quantity > 0).slice(0, 5);

  const getMarginColor = (margin: number) => {
    if (margin >= 50) return "hsl(var(--chart-1))";
    if (margin >= 30) return "hsl(var(--chart-2))";
    if (margin >= 15) return "hsl(var(--chart-3))";
    return "hsl(var(--destructive))";
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Products by Revenue */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Top 10 Produtos por Receita</CardTitle>
          </CardHeader>
          <CardContent>
            {topProducts.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={topProducts} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" tickFormatter={(v) => `R$${v}`} />
                  <YAxis 
                    type="category" 
                    dataKey="name" 
                    width={100}
                    tick={{ fontSize: 12 }}
                  />
                  <Tooltip 
                    formatter={(value: number) => [`R$ ${value.toFixed(2)}`, 'Receita']}
                    labelFormatter={(label) => `Produto: ${label}`}
                  />
                  <Bar dataKey="revenue" radius={[0, 4, 4, 0]}>
                    {topProducts.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={getMarginColor(entry.margin)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                Sem dados de vendas
              </div>
            )}
          </CardContent>
        </Card>

        {/* Products by Margin */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Margem de Lucro por Produto</CardTitle>
          </CardHeader>
          <CardContent>
            {topProducts.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={topProducts} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" tickFormatter={(v) => `${v}%`} />
                  <YAxis 
                    type="category" 
                    dataKey="name" 
                    width={100}
                    tick={{ fontSize: 12 }}
                  />
                  <Tooltip 
                    formatter={(value: number) => [`${value.toFixed(1)}%`, 'Margem']}
                    labelFormatter={(label) => `Produto: ${label}`}
                  />
                  <Bar dataKey="margin" radius={[0, 4, 4, 0]}>
                    {topProducts.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={getMarginColor(entry.margin)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                Sem dados de vendas
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Low Margin Products Alert */}
      {lowMarginProducts.length > 0 && (
        <Card className="border-l-4 border-l-yellow-500">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              ⚠️ Produtos com Margem Baixa (menos de 30%)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {lowMarginProducts.map((product) => (
                <div 
                  key={product.name} 
                  className="p-4 bg-yellow-500/10 rounded-lg"
                >
                  <p className="font-medium">{product.name}</p>
                  <div className="flex justify-between mt-2 text-sm">
                    <span className="text-muted-foreground">Receita:</span>
                    <span>R$ {product.revenue.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Custo:</span>
                    <span>R$ {product.cost.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm font-medium">
                    <span className="text-muted-foreground">Margem:</span>
                    <span className="text-yellow-600">{product.margin.toFixed(1)}%</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    💡 Considere aumentar o preço ou reduzir custos
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Legend */}
      <Card>
        <CardContent className="pt-4">
          <p className="text-sm font-medium mb-2">Legenda de Cores (Margem de Lucro):</p>
          <div className="flex flex-wrap gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: "hsl(var(--chart-1))" }} />
              <span>Excelente (50%+)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: "hsl(var(--chart-2))" }} />
              <span>Bom (30-50%)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: "hsl(var(--chart-3))" }} />
              <span>Atenção (15-30%)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: "hsl(var(--destructive))" }} />
              <span>Crítico (&lt;15%)</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
