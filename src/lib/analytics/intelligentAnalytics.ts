import { AnalysisInput, AnalysisOutput, Trend } from "./types";
import { LearningEngine } from "./learningEngine";
import { ProblemDetector } from "./problemDetector";
import { SuggestionEngine } from "./suggestionEngine";
import { gerarPredicoes, Prediction } from "./predictions";
import { detectarTendencia, classificarTendencia, calcularConfiancaTendencia, calcularVariacaoPercentual } from "./dataAnalyzer";

export function analisarDadosInteligente(input: AnalysisInput): AnalysisOutput & { predicoes: Prediction[] } {
  const learning = new LearningEngine(input.historico, input.dados_atual);
  const detector = new ProblemDetector(learning, input.historico, input.dados_atual);
  const problemas = detector.detectarProblemas();
  const suggestionEngine = new SuggestionEngine(problemas, learning, input.historico, input.dados_atual);
  const sugestoes = suggestionEngine.gerarSugestoes();

  const calcTrend = (hist: number[], atual: number): Trend => {
    const slope = detectarTendencia([...hist, atual]);
    let varPerc = 0;
    if (hist.length >= 8) { varPerc = calcularVariacaoPercentual(hist.slice(-4).reduce((a, b) => a + b, 0) / 4, hist.slice(-8, -4).reduce((a, b) => a + b, 0) / 4); }
    else if (hist.length >= 2) varPerc = calcularVariacaoPercentual(hist[hist.length - 1], hist[hist.length - 2]);
    return { status: classificarTendencia(slope), variacao_percentual: varPerc, confianca: calcularConfiancaTendencia([...hist, atual]) };
  };

  const crescendo: any[] = [], caindo: any[] = [], estaveis: any[] = [];
  input.historico.produtos.mais_vendidos.forEach(p => {
    if (!p.vendas || p.vendas.length < 2) return;
    const slope = detectarTendencia(p.vendas);
    const status = classificarTendencia(slope, 0.3);
    const vendaAtual = input.dados_atual.produtos_mais_vendidos.find(x => x.produto === p.produto)?.vendas || 0;
    const mediaH = p.vendas.reduce((a, b) => a + b, 0) / p.vendas.length;
    const trend = { produto: p.produto, tendencia: status === "subindo" ? "crescendo" : status === "descendo" ? "caindo" : "estável" as any, variacao: calcularVariacaoPercentual(vendaAtual, mediaH) };
    if (status === "subindo") crescendo.push(trend); else if (status === "descendo") caindo.push(trend); else estaveis.push(trend);
  });

  return {
    problemas_detectados: problemas, sugestoes_personalizadas: sugestoes,
    tendencias: {
      abandonos: calcTrend(input.historico.abandonos, input.dados_atual.abandonos),
      conversao: calcTrend(input.historico.conversao, input.dados_atual.conversao),
      pedidos: calcTrend(input.historico.pedidos, input.dados_atual.pedidos_total),
      cancelamentos: calcTrend(input.historico.cancelamentos, input.dados_atual.cancelamentos),
      produtos: { crescendo: crescendo.slice(0, 5), caindo: caindo.slice(0, 5), estaveis: estaveis.slice(0, 5) },
    },
    metricas_aprendidas: learning.getResumoMetricas(),
    predicoes: gerarPredicoes(input.historico),
  };
}
