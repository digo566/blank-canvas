import Plot from "react-plotly.js";

interface CancellationsChartProps { data: number; total: number; }

export function CancellationsChart({ data, total }: CancellationsChartProps) {
  const completed = total - data;
  const rate = total > 0 ? ((data / total) * 100).toFixed(1) : "0";
  return (
    <div className="w-full h-[400px]">
      <Plot data={[{ type: "pie", values: [completed, data], labels: ["Concluídos", "Cancelados"], hole: 0.4, marker: { colors: ["hsl(var(--primary))", "hsl(var(--destructive))"] }, textinfo: "label+percent", hovertemplate: "<b>%{label}</b><br>Total: %{value}<br>%{percent}<extra></extra>" }]}
        layout={{ autosize: true, paper_bgcolor: "transparent", plot_bgcolor: "transparent", showlegend: true, legend: { font: { color: "hsl(var(--foreground))" } }, margin: { l: 20, r: 20, t: 20, b: 20 }, annotations: [{ text: `${rate}%<br><span style="font-size: 12px;">Taxa</span>`, font: { size: 24, color: "hsl(var(--foreground))" }, showarrow: false, x: 0.5, y: 0.5 }] }}
        config={{ responsive: true, displayModeBar: false }} className="w-full h-full" useResizeHandler style={{ width: "100%", height: "100%" }} />
    </div>
  );
}
