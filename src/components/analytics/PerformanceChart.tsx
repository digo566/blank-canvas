import Plot from "react-plotly.js";
import { AnalyticsData } from "@/hooks/useAnalyticsData";

interface PerformanceChartProps {
  data: AnalyticsData | null;
}

export function PerformanceChart({ data }: PerformanceChartProps) {
  if (!data) return null;

  const successRate = data.pedidos_total > 0 
    ? ((data.pedidos_total - data.cancelamentos) / data.pedidos_total) * 100 
    : 0;

  const categories = ["Taxa de Sucesso", "Taxa de Abandono", "Taxa de Cancelamento"];
  const values = [
    successRate,
    data.abandonos,
    data.pedidos_total > 0 ? (data.cancelamentos / data.pedidos_total) * 100 : 0,
  ];

  const chartData: any = [
    {
      type: "scatterpolar",
      r: values,
      theta: categories,
      fill: "toself",
      fillcolor: "hsl(var(--primary) / 0.3)",
      line: {
        color: "hsl(var(--primary))",
        width: 3,
      },
      marker: {
        size: 8,
        color: "hsl(var(--primary))",
      },
      hovertemplate: "<b>%{theta}</b><br>%{r:.1f}%<extra></extra>",
    },
  ];

  const layout: any = {
    autosize: true,
    paper_bgcolor: "transparent",
    plot_bgcolor: "transparent",
    polar: {
      radialaxis: {
        visible: true,
        range: [0, 100],
        gridcolor: "hsl(var(--muted))",
        color: "hsl(var(--foreground))",
      },
      angularaxis: {
        gridcolor: "hsl(var(--muted))",
        color: "hsl(var(--foreground))",
      },
      bgcolor: "transparent",
    },
    margin: { l: 60, r: 60, t: 40, b: 60 },
    showlegend: false,
  };

  const config: any = {
    responsive: true,
    displayModeBar: false,
  };

  return (
    <div className="w-full h-[400px]">
      <Plot
        data={chartData}
        layout={layout}
        config={config}
        className="w-full h-full"
        useResizeHandler
        style={{ width: "100%", height: "100%" }}
      />
    </div>
  );
}
