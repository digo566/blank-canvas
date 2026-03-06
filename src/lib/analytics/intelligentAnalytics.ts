import { AnalysisInput, AnalysisOutput, Trend, ProductTrend } from "./types";
import { LearningEngine } from "./learningEngine";
import { ProblemDetector } from "./problemDetector";
import { SuggestionEngine } from "./suggestionEngine";
import { gerarPredicoes, Prediction } from "./predictions";
import {
  detectarTendencia,
  classificarTendencia,
  calcularConfiancaTendencia,
  calcularVariacaoPercentual,
} from "./dataAnalyzer";

/**
 * Sistema Principal de Análise Inteligente
 * Orquestra aprendizado, detecção de problemas e geração de sugestões
 */
export function analisarDadosInteligente(input: AnalysisInput): AnalysisOutput & { predicoes: Prediction[] } {
  // 1. Inicializar motor de aprendizado
  const learning = new LearningEngine(input.historico, input.dados_atual);
  
  // 2. Detectar problemas
  const detector = new ProblemDetector(learning, input.historico, input.dados_atual);
  const problemas = detector.detectarProblemas();
  
  // 3. Gerar sugestões
  const suggestionEngine = new SuggestionEngine(
    problemas,
    learning,
    input.historico,
    input.dados_atual
  );
  const sugestoes = suggestionEngine.gerarSugestoes();
  
  // 4. Analisar tendências
  const tendencias = analisarTendencias(input);
  
  // 5. Gerar predições usando machine learning
  const predicoes = gerarPredicoes(input.historico);
  
  // 6. Retornar análise completa
  return {
    problemas_detectados: problemas,
    sugestoes_personalizadas: sugestoes,
    tendencias,
    metricas_aprendidas: learning.getResumoMetricas(),
    predicoes,
  };
}

/**
 * Analisa todas as tendências
 */
function analisarTendencias(input: AnalysisInput) {
  const { historico, dados_atual } = input;
  
  // Tendência de abandonos
  const trendAbandonos = calcularTendencia(historico.abandonos, dados_atual.abandonos);
  
  // Tendência de conversão
  const trendConversao = calcularTendencia(historico.conversao, dados_atual.conversao);
  
  // Tendência de pedidos
  const trendPedidos = calcularTendencia(historico.pedidos, dados_atual.pedidos_total);
  
  // Tendência de cancelamentos
  const trendCancelamentos = calcularTendencia(historico.cancelamentos, dados_atual.cancelamentos);
  
  // Tendências de produtos
  const produtosTendencias = analisarTendenciasProdutos(input);
  
  return {
    abandonos: trendAbandonos,
    conversao: trendConversao,
    pedidos: trendPedidos,
    cancelamentos: trendCancelamentos,
    produtos: produtosTendencias,
  };
}

/**
 * Calcula tendência para uma métrica
 */
function calcularTendencia(historico: number[], valorAtual: number): Trend {
  const slope = detectarTendencia([...historico, valorAtual]);
  const status = classificarTendencia(slope);
  const confianca = calcularConfiancaTendencia([...historico, valorAtual]);
  
  // Calcular variação percentual (últimas 4 semanas vs 4 anteriores)
  let variacaoPercentual = 0;
  if (historico.length >= 8) {
    const recente = historico.slice(-4).reduce((a, b) => a + b, 0) / 4;
    const anterior = historico.slice(-8, -4).reduce((a, b) => a + b, 0) / 4;
    variacaoPercentual = calcularVariacaoPercentual(recente, anterior);
  } else if (historico.length >= 2) {
    const recente = historico[historico.length - 1];
    const anterior = historico[historico.length - 2];
    variacaoPercentual = calcularVariacaoPercentual(recente, anterior);
  }
  
  return {
    status,
    variacao_percentual: variacaoPercentual,
    confianca,
  };
}

/**
 * Analisa tendências de produtos
 */
function analisarTendenciasProdutos(input: AnalysisInput) {
  const crescendo: ProductTrend[] = [];
  const caindo: ProductTrend[] = [];
  const estaveis: ProductTrend[] = [];
  
  // Analisar produtos mais vendidos
  input.historico.produtos.mais_vendidos.forEach((produto) => {
    if (!produto.vendas || produto.vendas.length < 2) return;
    
    const slope = detectarTendencia(produto.vendas);
    const status = classificarTendencia(slope, 0.3);
    
    const vendaAtual = input.dados_atual.produtos_mais_vendidos.find(
      (p) => p.produto === produto.produto
    )?.vendas || 0;
    
    const mediaHistorica = produto.vendas.reduce((a, b) => a + b, 0) / produto.vendas.length;
    const variacao = calcularVariacaoPercentual(vendaAtual, mediaHistorica);
    
    const trend: ProductTrend = {
      produto: produto.produto,
      tendencia: status === "subindo" ? "crescendo" : status === "descendo" ? "caindo" : "estável",
      variacao,
    };
    
    if (status === "subindo") crescendo.push(trend);
    else if (status === "descendo") caindo.push(trend);
    else estaveis.push(trend);
  });
  
  // Ordenar por variação
  crescendo.sort((a, b) => b.variacao - a.variacao);
  caindo.sort((a, b) => a.variacao - b.variacao);
  
  return {
    crescendo: crescendo.slice(0, 5),
    caindo: caindo.slice(0, 5),
    estaveis: estaveis.slice(0, 5),
  };
}
