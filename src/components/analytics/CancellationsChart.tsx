import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";

interface CancellationsChartProps { 
  data: number; 
  total: number; 
}

export function CancellationsChart({ data, total }: CancellationsChartProps) {
  const completed = total - data;
  const rate = total > 0 ? ((data / total) * 100).toFixed(1) : "0";
  
  const chartData = [
    { name: "Concluídos", value: completed },
    { name: "Cancelados", value: data }
  ];

  const COLORS = ["hsl(var(--primary))", "hsl(var(--destructive))"];

  return (
    <div className="w-full h-[400px]">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={80}
            outerRadius={120}
            paddingAngle={2}
            dataKey="value"
            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
          >
            {chartData.map((_, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index]} />
            ))}
          </Pie>
          <Tooltip 
            contentStyle={{ 
              backgroundColor: 'hsl(var(--card))', 
              border: '1px solid hsl(var(--border))',
              borderRadius: '8px'
            }}
          />
          <Legend 
            verticalAlign="bottom" 
            height={36}
            iconType="circle"
          />
        </PieChart>
      </ResponsiveContainer>
      <div className="text-center mt-4">
        <p className="text-3xl font-bold text-destructive">{rate}%</p>
        <p className="text-sm text-muted-foreground">Taxa de Cancelamento</p>
      </div>
    </div>
  );
}
