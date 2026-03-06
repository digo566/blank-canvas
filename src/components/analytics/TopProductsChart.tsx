import Plot from "react-plotly.js";

interface TopProductsChartProps {
  data: Array<{ produto: string; vendas: number }>;
}

export function TopProductsChart({ data }: TopProductsChartProps) {
  const chartData: any = [
    {
      type: "bar",
      x: data.map(d => d.produto),
      y: data.map(d => d.vendas),
      marker: {
        color: data.map((_, i) => `hsl(var(--primary) / ${1 - i * 0.15})`),
        line: {
          color: "hsl(var(--primary))",
          width: 2,
        },
      },
      hovertemplate: "<b>%{x}</b><br>Vendas: %{y}<extra></extra>",
    },
  ];

  const layout: any = {
    autosize: true,
    paper_bgcolor: "transparent",
    plot_bgcolor: "transparent",
    xaxis: {
      title: "",
      gridcolor: "hsl(var(--muted))",
      color: "hsl(var(--foreground))",
    },
    yaxis: {
      title: "Vendas",
      gridcolor: "hsl(var(--muted))",
      color: "hsl(var(--foreground))",
    },
    margin: { l: 60, r: 20, t: 20, b: 80 },
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
