import { HistoricalData } from "./types";
import { detectarTendencia, calcularMediaMovel } from "./dataAnalyzer";

export interface Prediction {
  tipo: "pedidos" | "cancelamentos" | "abandonos" | "conversao";
  valor_previsto: number;
  confianca: number;
  dias_a_frente: number;
  tendencia: "alta" | "baixa" | "estável";
}

/**
 * Gera predições usando regressão linear e médias móveis
 */
export function gerarPredicoes(historico: HistoricalData): Prediction[] {
  const predicoes: Prediction[] = [];
  
  // Predição de pedidos
  const trendPedidos = detectarTendencia(historico.pedidos);
  const mediaMovelPedidos = calcularMediaMovel(historico.pedidos, 4);
  const ultimaMedia = mediaMovelPedidos[mediaMovelPedidos.length - 1];
  
  predicoes.push({
    tipo: "pedidos",
    valor_previsto: Math.max(0, ultimaMedia + (trendPedidos * 7)), // 7 dias à frente
    confianca: calcularConfianca(historico.pedidos),
    dias_a_frente: 7,
    tendencia: classificarTendencia(trendPedidos)
  });
  
  // Predição de cancelamentos
  const trendCancelamentos = detectarTendencia(historico.cancelamentos);
  const mediaMovelCancelamentos = calcularMediaMovel(historico.cancelamentos, 4);
  const ultimaMediaCancelamentos = mediaMovelCancelamentos[mediaMovelCancelamentos.length - 1];
  
  predicoes.push({
    tipo: "cancelamentos",
    valor_previsto: Math.max(0, ultimaMediaCancelamentos + (trendCancelamentos * 7)),
    confianca: calcularConfianca(historico.cancelamentos),
    dias_a_frente: 7,
    tendencia: classificarTendencia(trendCancelamentos)
  });
  
  // Predição de abandonos
  const trendAbandonos = detectarTendencia(historico.abandonos);
  const mediaMovelAbandonos = calcularMediaMovel(historico.abandonos, 4);
  const ultimaMediaAbandonos = mediaMovelAbandonos[mediaMovelAbandonos.length - 1];
  
  predicoes.push({
    tipo: "abandonos",
    valor_previsto: Math.max(0, Math.min(100, ultimaMediaAbandonos + (trendAbandonos * 7))),
    confianca: calcularConfianca(historico.abandonos),
    dias_a_frente: 7,
    tendencia: classificarTendencia(trendAbandonos)
  });
  
  // Predição de conversão
  const trendConversao = detectarTendencia(historico.conversao);
  const mediaMovelConversao = calcularMediaMovel(historico.conversao, 4);
  const ultimaMediaConversao = mediaMovelConversao[mediaMovelConversao.length - 1];
  
  predicoes.push({
    tipo: "conversao",
    valor_previsto: Math.max(0, Math.min(100, ultimaMediaConversao + (trendConversao * 7))),
    confianca: calcularConfianca(historico.conversao),
    dias_a_frente: 7,
    tendencia: classificarTendencia(trendConversao)
  });
  
  return predicoes;
}

function calcularConfianca(dados: number[]): number {
  if (dados.length < 4) return 30;
  
  // Calcular variabilidade dos dados
  const media = dados.reduce((a, b) => a + b, 0) / dados.length;
  const variancia = dados.reduce((sum, val) => sum + Math.pow(val - media, 2), 0) / dados.length;
  const coefVariacao = Math.sqrt(variancia) / media;
  
  // Quanto menor a variação, maior a confiança
  const confianca = Math.max(40, Math.min(95, 95 - (coefVariacao * 100)));
  
  return Math.round(confianca);
}

function classificarTendencia(slope: number): "alta" | "baixa" | "estável" {
  if (slope > 0.5) return "alta";
  if (slope < -0.5) return "baixa";
  return "estável";
}
