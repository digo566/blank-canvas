import Plot from "react-plotly.js";

interface OrdersChartProps { data: number[]; period: "day" | "week" | "month"; labels?: string[]; }

export function OrdersChart({ data, period, labels: customLabels }: OrdersChartProps) {
  const labels = customLabels || (period === "day" ? ["00h","04h","08h","12h","16h","20h","23h"] : period === "week" ? ["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"] : ["Sem 1","Sem 2","Sem 3","Sem 4"]);
  const displayData = data.slice(0, labels.length); const displayLabels = labels.slice(0, data.length);
  return (
    <div className="w-full h-[400px]">
      <Plot data={[{ type: "scatter3d", mode: "lines+markers", x: displayLabels, y: displayData, z: displayData.map((_, i) => i), line: { color: "hsl(var(--primary))", width: 6 }, marker: { size: 8, color: displayData, colorscale: "Viridis" }, hovertemplate: "<b>%{x}</b><br>Pedidos: %{y}<extra></extra>" }]}
        layout={{ autosize: true, paper_bgcolor: "transparent", plot_bgcolor: "transparent", scene: { xaxis: { title: "Período", gridcolor: "hsl(var(--muted))" }, yaxis: { title: "Pedidos", gridcolor: "hsl(var(--muted))" }, zaxis: { showgrid: false, showticklabels: false }, camera: { eye: { x: 1.5, y: 1.5, z: 1.3 } } }, margin: { l: 0, r: 0, t: 0, b: 0 } }}
        config={{ responsive: true, displayModeBar: false }} className="w-full h-full" useResizeHandler style={{ width: "100%", height: "100%" }} />
    </div>
  );
}
