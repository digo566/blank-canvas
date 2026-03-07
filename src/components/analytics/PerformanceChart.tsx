import Plot from "react-plotly.js";
import { AnalyticsData } from "@/hooks/useAnalyticsData";

export function PerformanceChart({ data }: { data: AnalyticsData | null }) {
  if (!data) return null;
  const successRate = data.pedidos_total > 0 ? ((data.pedidos_total - data.cancelamentos) / data.pedidos_total) * 100 : 0;
  const values = [successRate, data.abandonos, data.pedidos_total > 0 ? (data.cancelamentos / data.pedidos_total) * 100 : 0];
  return (
    <div className="w-full h-[400px]">
      <Plot data={[{ type: "scatterpolar", r: values, theta: ["Taxa de Sucesso", "Taxa de Abandono", "Taxa de Cancelamento"], fill: "toself", fillcolor: "hsl(var(--primary) / 0.3)", line: { color: "hsl(var(--primary))", width: 3 }, marker: { size: 8 }, hovertemplate: "<b>%{theta}</b><br>%{r:.1f}%<extra></extra>" }]}
        layout={{ autosize: true, paper_bgcolor: "transparent", polar: { radialaxis: { visible: true, range: [0, 100], gridcolor: "hsl(var(--muted))" }, bgcolor: "transparent" }, margin: { l: 60, r: 60, t: 40, b: 60 }, showlegend: false }}
        config={{ responsive: true, displayModeBar: false }} className="w-full h-full" useResizeHandler style={{ width: "100%", height: "100%" }} />
    </div>
  );
}
