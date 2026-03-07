import { HistoricalData } from "./types";
import { detectarTendencia, calcularMediaMovel } from "./dataAnalyzer";

export interface Prediction { tipo: "pedidos" | "cancelamentos" | "abandonos" | "conversao"; valor_previsto: number; confianca: number; dias_a_frente: number; tendencia: "alta" | "baixa" | "estável"; }

export function gerarPredicoes(historico: HistoricalData): Prediction[] {
  const predicoes: Prediction[] = [];
  const predict = (dados: number[], tipo: Prediction["tipo"], clamp = false) => {
    const trend = detectarTendencia(dados);
    const mm = calcularMediaMovel(dados, 4);
    const ultima = mm[mm.length - 1];
    let val = ultima + (trend * 7);
    if (clamp) val = Math.max(0, Math.min(100, val));
    else val = Math.max(0, val);
    predicoes.push({ tipo, valor_previsto: val, confianca: calcConf(dados), dias_a_frente: 7, tendencia: trend > 0.5 ? "alta" : trend < -0.5 ? "baixa" : "estável" });
  };
  predict(historico.pedidos, "pedidos");
  predict(historico.cancelamentos, "cancelamentos");
  predict(historico.abandonos, "abandonos", true);
  predict(historico.conversao, "conversao", true);
  return predicoes;
}

function calcConf(dados: number[]): number {
  if (dados.length < 4) return 30;
  const media = dados.reduce((a, b) => a + b, 0) / dados.length;
  const variancia = dados.reduce((s, v) => s + Math.pow(v - media, 2), 0) / dados.length;
  return Math.round(Math.max(40, Math.min(95, 95 - (Math.sqrt(variancia) / media) * 100)));
}
