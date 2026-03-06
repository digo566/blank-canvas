import Plot from "react-plotly.js";

interface BottomProductsChartProps {
  data: Array<{ produto: string; vendas: number }>;
}

export function BottomProductsChart({ data }: BottomProductsChartProps) {
  const chartData: any = [
    {
      type: "bar",
      x: data.map(d => d.vendas),
      y: data.map(d => d.produto),
      orientation: "h",
      marker: {
        color: data.map((_, i) => `hsl(var(--muted-foreground) / ${0.4 + i * 0.1})`),
        line: {
          color: "hsl(var(--muted-foreground))",
          width: 1,
        },
      },
      hovertemplate: "<b>%{y}</b><br>Vendas: %{x}<extra></extra>",
    },
  ];

  const layout: any = {
    autosize: true,
    paper_bgcolor: "transparent",
    plot_bgcolor: "transparent",
    xaxis: {
      title: "Vendas",
      gridcolor: "hsl(var(--muted))",
      color: "hsl(var(--foreground))",
    },
    yaxis: {
      title: "",
      gridcolor: "hsl(var(--muted))",
      color: "hsl(var(--foreground))",
    },
    margin: { l: 150, r: 20, t: 20, b: 60 },
    hovermode: "closest",
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
