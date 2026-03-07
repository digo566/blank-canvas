import { Problem, HistoricalData, CurrentData, ProductTrend } from "./types";
import { LearningEngine } from "./learningEngine";
import { calcularVariacaoPercentual } from "./dataAnalyzer";

export class SuggestionEngine {
  private problemas: Problem[]; private learning: LearningEngine; private historico: HistoricalData; private atual: CurrentData;
  constructor(problemas: Problem[], learning: LearningEngine, historico: HistoricalData, atual: CurrentData) { this.problemas = problemas; this.learning = learning; this.historico = historico; this.atual = atual; }

  gerarSugestoes(): string[] {
    const s: string[] = [];
    this.problemas.forEach(p => s.push(p.sugestao));
    s.push(...this.sugestoesProativas(), ...this.sugestoesPorTendencia(), ...this.sugestoesOtimizacaoProdutos());
    return [...new Set(s)];
  }

  private sugestoesProativas(): string[] {
    const s: string[] = [];
    if (this.atual.conversao < 3.0 && this.atual.conversao >= this.learning.metricasConversao.media) s.push("Conversão dentro do padrão, mas pode melhorar. Teste fotos profissionais.");
    if (this.atual.abandonos > 10 && this.atual.abandonos <= this.learning.metricasAbandonos.limite_superior) s.push("Adicione badges de 'Mais Vendido' nos produtos populares.");
    const top = this.atual.produtos_mais_vendidos[0];
    if (top && top.vendas > 50) s.push(`"${top.produto}" é seu campeão. Crie variações ou combos.`);
    return s;
  }

  private sugestoesPorTendencia(): string[] {
    const s: string[] = [];
    if (this.learning.metricasPedidos.tendencia > 0.5) s.push("Negócio em crescimento! Prepare estoque e capacidade.");
    if (this.learning.metricasPedidos.tendencia < -0.5) s.push("Tendência de queda. Lance promoções e revise cardápio.");
    if (this.learning.metricasAbandonos.tendencia > 0.3) s.push("Abandono crescente. Simplifique o checkout.");
    return s;
  }

  private sugestoesOtimizacaoProdutos(): string[] {
    const s: string[] = [];
    const padroes = this.learning.aprenderPadraoProdutos();
    this.atual.produtos_mais_vendidos.forEach(p => {
      const pad = padroes.get(p.produto);
      if (pad && pad.tendencia > 0.5) s.push(`"${p.produto}" em ascensão. Destaque no topo do cardápio.`);
    });
    const estagnados = this.atual.produtos_menos_vendidos.filter(p => p.vendas < 15);
    if (estagnados.length >= 2) s.push(`Crie combos com: ${estagnados.slice(0, 2).map(p => p.produto).join(", ")}.`);
    return s;
  }
}
