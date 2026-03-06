import { HistoricalData, CurrentData } from "./types";
import { aprenderPadrao, type LearningMetrics } from "./dataAnalyzer";

/**
 * Motor de Aprendizado Contínuo
 * Aprende os padrões históricos do restaurante e ajusta limites adaptativos
 */
export class LearningEngine {
  private historico: HistoricalData;
  private atual: CurrentData;
  
  // Métricas aprendidas
  public metricasAbandonos: LearningMetrics;
  public metricasConversao: LearningMetrics;
  public metricasCancelamentos: LearningMetrics;
  public metricasPedidos: LearningMetrics;
  
  constructor(historico: HistoricalData, atual: CurrentData) {
    this.historico = historico;
    this.atual = atual;
    
    // Aprender padrões
    this.metricasAbandonos = aprenderPadrao(historico.abandonos);
    this.metricasConversao = aprenderPadrao(historico.conversao);
    this.metricasCancelamentos = aprenderPadrao(historico.cancelamentos);
    this.metricasPedidos = aprenderPadrao(historico.pedidos);
  }
  
  /**
   * Verifica se o valor atual está dentro do padrão esperado
   */
  isDentroDoPadrao(tipo: "abandonos" | "conversao" | "cancelamentos" | "pedidos"): boolean {
    let valorAtual: number;
    let metricas: LearningMetrics;
    
    switch (tipo) {
      case "abandonos":
        valorAtual = this.atual.abandonos;
        metricas = this.metricasAbandonos;
        break;
      case "conversao":
        valorAtual = this.atual.conversao;
        metricas = this.metricasConversao;
        break;
      case "cancelamentos":
        valorAtual = this.atual.cancelamentos;
        metricas = this.metricasCancelamentos;
        break;
      case "pedidos":
        valorAtual = this.atual.pedidos_total;
        metricas = this.metricasPedidos;
        break;
    }
    
    return valorAtual >= metricas.limite_inferior && valorAtual <= metricas.limite_superior;
  }
  
  /**
   * Retorna o desvio percentual em relação à média histórica
   */
  getDesvioPercentual(tipo: "abandonos" | "conversao" | "cancelamentos" | "pedidos"): number {
    let valorAtual: number;
    let media: number;
    
    switch (tipo) {
      case "abandonos":
        valorAtual = this.atual.abandonos;
        media = this.metricasAbandonos.media;
        break;
      case "conversao":
        valorAtual = this.atual.conversao;
        media = this.metricasConversao.media;
        break;
      case "cancelamentos":
        valorAtual = this.atual.cancelamentos;
        media = this.metricasCancelamentos.media;
        break;
      case "pedidos":
        valorAtual = this.atual.pedidos_total;
        media = this.metricasPedidos.media;
        break;
    }
    
    if (media === 0) return 0;
    return ((valorAtual - media) / media) * 100;
  }
  
  /**
   * Aprende padrões de produtos ao longo do tempo
   */
  aprenderPadraoProdutos(): Map<string, LearningMetrics> {
    const padroes = new Map<string, LearningMetrics>();
    
    // Processar produtos mais vendidos
    this.historico.produtos.mais_vendidos.forEach((produto) => {
      if (produto.vendas && produto.vendas.length > 0) {
        padroes.set(produto.produto, aprenderPadrao(produto.vendas));
      }
    });
    
    // Processar produtos menos vendidos
    this.historico.produtos.menos_vendidos.forEach((produto) => {
      if (produto.vendas && produto.vendas.length > 0) {
        padroes.set(produto.produto, aprenderPadrao(produto.vendas));
      }
    });
    
    return padroes;
  }
  
  /**
   * Retorna resumo das métricas aprendidas
   */
  getResumoMetricas() {
    return {
      media_abandonos: this.metricasAbandonos.media,
      media_conversao: this.metricasConversao.media,
      media_cancelamentos: this.metricasCancelamentos.media,
      desvio_padrao_abandonos: this.metricasAbandonos.desvio_padrao,
      desvio_padrao_conversao: this.metricasConversao.desvio_padrao,
    };
  }
}
