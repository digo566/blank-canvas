import Plot from "react-plotly.js";

export function AbandonmentChart({ rate }: { rate: number }) {
  return (
    <div className="w-full h-[400px]">
      <Plot data={[{ type: "indicator", mode: "gauge+number+delta", value: rate, delta: { reference: 20, increasing: { color: "hsl(var(--destructive))" } }, gauge: { axis: { range: [0, 100] }, bar: { color: rate > 20 ? "hsl(var(--destructive))" : "hsl(var(--primary))" }, bgcolor: "hsl(var(--muted))", steps: [{ range: [0, 15], color: "hsl(var(--primary) / 0.2)" }, { range: [15, 30], color: "orange" }, { range: [30, 100], color: "hsl(var(--destructive) / 0.2)" }], threshold: { line: { color: "hsl(var(--destructive))", width: 4 }, thickness: 0.75, value: 20 } } }]}
        layout={{ autosize: true, paper_bgcolor: "transparent", font: { color: "hsl(var(--foreground))" }, margin: { l: 20, r: 20, t: 40, b: 20 } }}
        config={{ responsive: true, displayModeBar: false }} className="w-full h-full" useResizeHandler style={{ width: "100%", height: "100%" }} />
    </div>
  );
}
