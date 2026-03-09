import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface OrdersChartProps { 
  data: number[]; 
  period: "day" | "week" | "month"; 
  labels?: string[]; 
}

export function OrdersChart({ data, period, labels: customLabels }: OrdersChartProps) {
  const labels = customLabels || (
    period === "day" 
      ? ["00h","04h","08h","12h","16h","20h","23h"] 
      : period === "week" 
      ? ["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"] 
      : ["Sem 1","Sem 2","Sem 3","Sem 4"]
  );
  
  const chartData = labels.slice(0, data.length).map((label, index) => ({
    name: label,
    pedidos: data[index] || 0
  }));

  return (
    <div className="w-full h-[400px]">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted))" opacity={0.3} />
          <XAxis 
            dataKey="name" 
            stroke="hsl(var(--muted-foreground))"
            tick={{ fill: 'hsl(var(--muted-foreground))' }}
          />
          <YAxis 
            stroke="hsl(var(--muted-foreground))"
            tick={{ fill: 'hsl(var(--muted-foreground))' }}
          />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: 'hsl(var(--card))', 
              border: '1px solid hsl(var(--border))',
              borderRadius: '8px'
            }}
            labelStyle={{ color: 'hsl(var(--foreground))' }}
          />
          <Line 
            type="monotone" 
            dataKey="pedidos" 
            stroke="hsl(var(--primary))" 
            strokeWidth={3}
            dot={{ fill: 'hsl(var(--primary))', r: 5 }}
            activeDot={{ r: 7 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
