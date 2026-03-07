import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import type { ProductAnalysis } from "@/lib/finance/types";

export function ProductAnalysisChart({ products }: { products: ProductAnalysis[] }) {
  const topProducts = products.slice(0, 10);
  const lowMargin = products.filter(p => p.margin < 30 && p.quantity > 0).slice(0, 5);
  const getColor = (m: number) => m >= 50 ? "hsl(var(--chart-1))" : m >= 30 ? "hsl(var(--chart-2))" : m >= 15 ? "hsl(var(--chart-3))" : "hsl(var(--destructive))";

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card><CardHeader><CardTitle className="text-lg">Top 10 por Receita</CardTitle></CardHeader><CardContent>{topProducts.length > 0 ? <ResponsiveContainer width="100%" height={300}><BarChart data={topProducts} layout="vertical"><CartesianGrid strokeDasharray="3 3" /><XAxis type="number" tickFormatter={v => `R$${v}`} /><YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 12 }} /><Tooltip formatter={(v: number) => [`R$ ${v.toFixed(2)}`, 'Receita']} /><Bar dataKey="revenue" radius={[0,4,4,0]}>{topProducts.map((e, i) => <Cell key={i} fill={getColor(e.margin)} />)}</Bar></BarChart></ResponsiveContainer> : <div className="flex items-center justify-center h-[300px] text-muted-foreground">Sem dados</div>}</CardContent></Card>
        <Card><CardHeader><CardTitle className="text-lg">Margem de Lucro</CardTitle></CardHeader><CardContent>{topProducts.length > 0 ? <ResponsiveContainer width="100%" height={300}><BarChart data={topProducts} layout="vertical"><CartesianGrid strokeDasharray="3 3" /><XAxis type="number" tickFormatter={v => `${v}%`} /><YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 12 }} /><Tooltip formatter={(v: number) => [`${v.toFixed(1)}%`, 'Margem']} /><Bar dataKey="margin" radius={[0,4,4,0]}>{topProducts.map((e, i) => <Cell key={i} fill={getColor(e.margin)} />)}</Bar></BarChart></ResponsiveContainer> : <div className="flex items-center justify-center h-[300px] text-muted-foreground">Sem dados</div>}</CardContent></Card>
      </div>
      {lowMargin.length > 0 && <Card className="border-l-4 border-l-yellow-500"><CardHeader><CardTitle className="text-lg">⚠️ Margem Baixa (&lt;30%)</CardTitle></CardHeader><CardContent><div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">{lowMargin.map(p => <div key={p.name} className="p-4 bg-yellow-500/10 rounded-lg"><p className="font-medium">{p.name}</p><div className="flex justify-between mt-2 text-sm"><span className="text-muted-foreground">Receita:</span><span>R$ {p.revenue.toFixed(2)}</span></div><div className="flex justify-between text-sm"><span className="text-muted-foreground">Margem:</span><span className="text-yellow-600">{p.margin.toFixed(1)}%</span></div></div>)}</div></CardContent></Card>}
    </div>
  );
}
