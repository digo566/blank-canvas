import Plot from "react-plotly.js";

interface AbandonmentChartProps {
  rate: number;
}

export function AbandonmentChart({ rate }: AbandonmentChartProps) {
  const chartData: any = [
    {
      type: "indicator",
      mode: "gauge+number+delta",
      value: rate,
      delta: { reference: 20, increasing: { color: "hsl(var(--destructive))" } },
      gauge: {
        axis: { range: [0, 100], tickcolor: "hsl(var(--foreground))" },
        bar: { color: rate > 20 ? "hsl(var(--destructive))" : "hsl(var(--primary))" },
        bgcolor: "hsl(var(--muted))",
        borderwidth: 2,
        bordercolor: "hsl(var(--border))",
        steps: [
          { range: [0, 15], color: "hsl(var(--primary) / 0.2)" },
          { range: [15, 30], color: "orange" },
          { range: [30, 100], color: "hsl(var(--destructive) / 0.2)" },
        ],
        threshold: {
          line: { color: "hsl(var(--destructive))", width: 4 },
          thickness: 0.75,
          value: 20,
        },
      },
    },
  ];

  const layout: any = {
    autosize: true,
    paper_bgcolor: "transparent",
    plot_bgcolor: "transparent",
    font: { color: "hsl(var(--foreground))", size: 14 },
    margin: { l: 20, r: 20, t: 40, b: 20 },
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
