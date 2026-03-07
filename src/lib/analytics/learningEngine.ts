import { HistoricalData, CurrentData } from "./types";
import { aprenderPadrao, type LearningMetrics } from "./dataAnalyzer";

export class LearningEngine {
  private historico: HistoricalData;
  private atual: CurrentData;
  public metricasAbandonos: LearningMetrics;
  public metricasConversao: LearningMetrics;
  public metricasCancelamentos: LearningMetrics;
  public metricasPedidos: LearningMetrics;

  constructor(historico: HistoricalData, atual: CurrentData) {
    this.historico = historico; this.atual = atual;
    this.metricasAbandonos = aprenderPadrao(historico.abandonos);
    this.metricasConversao = aprenderPadrao(historico.conversao);
    this.metricasCancelamentos = aprenderPadrao(historico.cancelamentos);
    this.metricasPedidos = aprenderPadrao(historico.pedidos);
  }

  isDentroDoPadrao(tipo: "abandonos" | "conversao" | "cancelamentos" | "pedidos"): boolean {
    const map = { abandonos: { val: this.atual.abandonos, met: this.metricasAbandonos }, conversao: { val: this.atual.conversao, met: this.metricasConversao }, cancelamentos: { val: this.atual.cancelamentos, met: this.metricasCancelamentos }, pedidos: { val: this.atual.pedidos_total, met: this.metricasPedidos } };
    const { val, met } = map[tipo];
    return val >= met.limite_inferior && val <= met.limite_superior;
  }

  getDesvioPercentual(tipo: "abandonos" | "conversao" | "cancelamentos" | "pedidos"): number {
    const map = { abandonos: { val: this.atual.abandonos, med: this.metricasAbandonos.media }, conversao: { val: this.atual.conversao, med: this.metricasConversao.media }, cancelamentos: { val: this.atual.cancelamentos, med: this.metricasCancelamentos.media }, pedidos: { val: this.atual.pedidos_total, med: this.metricasPedidos.media } };
    const { val, med } = map[tipo];
    if (med === 0) return 0;
    return ((val - med) / med) * 100;
  }

  aprenderPadraoProdutos(): Map<string, LearningMetrics> {
    const padroes = new Map<string, LearningMetrics>();
    [...this.historico.produtos.mais_vendidos, ...this.historico.produtos.menos_vendidos].forEach(p => { if (p.vendas?.length > 0) padroes.set(p.produto, aprenderPadrao(p.vendas)); });
    return padroes;
  }

  getResumoMetricas() {
    return { media_abandonos: this.metricasAbandonos.media, media_conversao: this.metricasConversao.media, media_cancelamentos: this.metricasCancelamentos.media, desvio_padrao_abandonos: this.metricasAbandonos.desvio_padrao, desvio_padrao_conversao: this.metricasConversao.desvio_padrao };
  }
}
