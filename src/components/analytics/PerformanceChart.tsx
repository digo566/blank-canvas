import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { AnalyticsData } from "@/hooks/useAnalyticsData";

export function PerformanceChart({ data }: { data: AnalyticsData | null }) {
  if (!data) return null;

  const successRate = data.pedidos_total > 0 
    ? ((data.pedidos_total - data.cancelamentos) / data.pedidos_total) * 100 
    : 0;
  
  const cancellationRate = data.pedidos_total > 0 
    ? (data.cancelamentos / data.pedidos_total) * 100 
    : 0;

  const chartData = [
    { 
      name: "Taxa de Sucesso", 
      value: successRate,
      color: "hsl(var(--primary))"
    },
    { 
      name: "Taxa de Abandono", 
      value: data.abandonos,
      color: "hsl(var(--chart-2))"
    },
    { 
      name: "Taxa de Cancelamento", 
      value: cancellationRate,
      color: "hsl(var(--destructive))"
    }
  ];

  return (
    <div className="w-full h-[400px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 60 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted))" opacity={0.3} />
          <XAxis 
            dataKey="name" 
            stroke="hsl(var(--muted-foreground))"
            tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
            angle={-15}
            textAnchor="end"
            height={80}
          />
          <YAxis 
            stroke="hsl(var(--muted-foreground))"
            tick={{ fill: 'hsl(var(--muted-foreground))' }}
            label={{ value: 'Porcentagem (%)', angle: -90, position: 'insideLeft', fill: 'hsl(var(--muted-foreground))' }}
            domain={[0, 100]}
          />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: 'hsl(var(--card))', 
              border: '1px solid hsl(var(--border))',
              borderRadius: '8px'
            }}
            labelStyle={{ color: 'hsl(var(--foreground))' }}
            formatter={(value: number) => [`${value.toFixed(1)}%`, '']}
          />
          <Bar dataKey="value" radius={[8, 8, 0, 0]}>
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
