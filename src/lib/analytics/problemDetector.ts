import { Problem, HistoricalData, CurrentData } from "./types";
import { LearningEngine } from "./learningEngine";
import { detectarAnomalia, calcularVariacaoPercentual } from "./dataAnalyzer";

export class ProblemDetector {
  private learning: LearningEngine; private historico: HistoricalData; private atual: CurrentData;
  constructor(learning: LearningEngine, historico: HistoricalData, atual: CurrentData) { this.learning = learning; this.historico = historico; this.atual = atual; }

  detectarProblemas(): Problem[] {
    return [...this.verificarAbandono(), ...this.verificarConversao(), ...this.verificarCancelamentos(), ...this.verificarProdutosComQueda(), ...this.verificarProdutosSemGiro(), ...this.verificarQuedaPedidos()];
  }

  private verificarAbandono(): Problem[] {
    const desvio = this.learning.getDesvioPercentual("abandonos");
    const anomalia = detectarAnomalia(this.atual.abandonos, this.learning.metricasAbandonos);
    if (anomalia.isAnomalia && desvio > 0) return [{ alerta: true, tipo: "abandono_acima_do_padrao", gravidade: anomalia.gravidade, mensagem: `O abandono está ${desvio.toFixed(1)}% acima do padrão (${this.learning.metricasAbandonos.media.toFixed(1)}%).`, sugestao: "Revise fotos, descrições e preços. Simplifique o checkout.", impacto_estimado: "Alto" }];
    return [];
  }

  private verificarConversao(): Problem[] {
    const desvio = this.learning.getDesvioPercentual("conversao");
    const anomalia = detectarAnomalia(this.atual.conversao, this.learning.metricasConversao);
    if (anomalia.isAnomalia && desvio < 0) return [{ alerta: true, tipo: "conversao_abaixo_do_padrao", gravidade: anomalia.gravidade, mensagem: `Conversão caiu ${Math.abs(desvio).toFixed(1)}% abaixo da média.`, sugestao: "Destaque promoções e produtos populares.", impacto_estimado: "Médio" }];
    return [];
  }

  private verificarCancelamentos(): Problem[] {
    const desvio = this.learning.getDesvioPercentual("cancelamentos");
    const anomalia = detectarAnomalia(this.atual.cancelamentos, this.learning.metricasCancelamentos);
    if (anomalia.isAnomalia && desvio > 0) return [{ alerta: true, tipo: "cancelamentos_elevados", gravidade: anomalia.gravidade, mensagem: `Cancelamentos ${desvio.toFixed(1)}% acima do normal.`, sugestao: "Investigue motivos dos cancelamentos.", impacto_estimado: "Alto" }];
    return [];
  }

  private verificarProdutosComQueda(): Problem[] {
    const problemas: Problem[] = [];
    const padroes = this.learning.aprenderPadraoProdutos();
    this.atual.produtos_mais_vendidos.forEach(p => {
      const padrao = padroes.get(p.produto);
      if (padrao && p.vendas < padrao.media * 0.7) {
        const queda = ((padrao.media - p.vendas) / padrao.media) * 100;
        problemas.push({ alerta: true, tipo: "produto_popular_em_queda", gravidade: queda > 40 ? "alta" : "média", mensagem: `"${p.produto}" teve queda de ${queda.toFixed(0)}%.`, sugestao: "Considere promoções para reativar vendas.", impacto_estimado: "Alto" });
      }
    });
    return problemas;
  }

  private verificarProdutosSemGiro(): Problem[] {
    const sem = this.atual.produtos_menos_vendidos.filter(p => p.vendas < 10);
    if (sem.length > 0 && this.historico.semanas >= 6) return [{ alerta: true, tipo: "produtos_sem_giro", gravidade: "média", mensagem: `${sem.length} produto(s) com vendas muito baixas.`, sugestao: `Considere reformular: ${sem.map(p => p.produto).join(", ")}.`, impacto_estimado: "Baixo" }];
    return [];
  }

  private verificarQuedaPedidos(): Problem[] {
    if (this.historico.pedidos.length >= 6) {
      const rec = this.historico.pedidos.slice(-3).reduce((a, b) => a + b, 0) / 3;
      const ant = this.historico.pedidos.slice(-6, -3).reduce((a, b) => a + b, 0) / 3;
      const variacao = calcularVariacaoPercentual(rec, ant);
      if (variacao < -15) return [{ alerta: true, tipo: "queda_pedidos_recente", gravidade: variacao < -30 ? "crítica" : "alta", mensagem: `Queda de ${Math.abs(variacao).toFixed(0)}% no volume de pedidos.`, sugestao: "Revise marketing, preços e disponibilidade.", impacto_estimado: "Crítico" }];
    }
    return [];
  }
}
