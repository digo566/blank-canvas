import { Problem, HistoricalData, CurrentData, ProductTrend } from "./types";
import { LearningEngine } from "./learningEngine";
import { calcularVariacaoPercentual } from "./dataAnalyzer";

/**
 * Motor de Sugestões Inteligentes
 * Gera recomendações personalizadas baseadas no histórico e problemas detectados
 */
export class SuggestionEngine {
  private problemas: Problem[];
  private learning: LearningEngine;
  private historico: HistoricalData;
  private atual: CurrentData;
  
  constructor(
    problemas: Problem[],
    learning: LearningEngine,
    historico: HistoricalData,
    atual: CurrentData
  ) {
    this.problemas = problemas;
    this.learning = learning;
    this.historico = historico;
    this.atual = atual;
  }
  
  /**
   * Gera todas as sugestões personalizadas
   */
  gerarSugestoes(): string[] {
    const sugestoes: string[] = [];
    
    // Sugestões baseadas em problemas detectados
    this.problemas.forEach((problema) => {
      sugestoes.push(problema.sugestao);
    });
    
    // Sugestões proativas (mesmo sem problemas críticos)
    sugestoes.push(...this.sugestoesProativas());
    
    // Sugestões baseadas em tendências
    sugestoes.push(...this.sugestoesPorTendencia());
    
    // Sugestões de otimização de produtos
    sugestoes.push(...this.sugestoesOtimizacaoProdutos());
    
    // Remover duplicatas
    return [...new Set(sugestoes)];
  }
  
  /**
   * Sugestões proativas para melhorar performance
   */
  private sugestoesProativas(): string[] {
    const sugestoes: string[] = [];
    
    // Análise de conversão
    if (this.atual.conversao < 3.0 && this.atual.conversao >= this.learning.metricasConversao.media) {
      sugestoes.push("Sua conversão está dentro do padrão, mas pode melhorar. Teste fotos profissionais e descrições mais atrativas.");
    }
    
    // Análise de abandono
    if (this.atual.abandonos > 10 && this.atual.abandonos <= this.learning.metricasAbandonos.limite_superior) {
      sugestoes.push("Adicione badges de 'Mais Vendido' ou 'Recomendado' nos produtos populares para reduzir abandono.");
    }
    
    // Produtos populares
    const topProduto = this.atual.produtos_mais_vendidos[0];
    if (topProduto && topProduto.vendas > 50) {
      sugestoes.push(`"${topProduto.produto}" é seu campeão de vendas. Considere criar variações ou combos com este item.`);
    }
    
    // Semana forte
    if (this.historico.pedidos.length >= 4) {
      const ultimasQuatro = this.historico.pedidos.slice(-4);
      const melhorSemana = Math.max(...ultimasQuatro);
      const indiceMelhor = ultimasQuatro.indexOf(melhorSemana);
      
      if (melhorSemana > this.learning.metricasPedidos.media * 1.2) {
        sugestoes.push(`Sua melhor semana recente teve ${melhorSemana} pedidos. Analise o que funcionou naquele período e replique.`);
      }
    }
    
    return sugestoes;
  }
  
  /**
   * Sugestões baseadas em tendências detectadas
   */
  private sugestoesPorTendencia(): string[] {
    const sugestoes: string[] = [];
    
    // Tendência de crescimento
    if (this.learning.metricasPedidos.tendencia > 0.5) {
      sugestoes.push("Seu negócio está em crescimento! Prepare-se para escalar: revise estoque e capacidade de atendimento.");
    }
    
    // Tendência de queda
    if (this.learning.metricasPedidos.tendencia < -0.5) {
      sugestoes.push("Tendência de queda detectada. Ação recomendada: lance promoções, aumente presença em redes sociais e revise cardápio.");
    }
    
    // Abandono crescente
    if (this.learning.metricasAbandonos.tendencia > 0.3) {
      sugestoes.push("Taxa de abandono vem crescendo. Simplifique o checkout e destaque frete grátis ou descontos no carrinho.");
    }
    
    // Conversão melhorando
    if (this.learning.metricasConversao.tendencia > 0.1) {
      sugestoes.push("Conversão em alta! Continue investindo nas estratégias atuais de apresentação e precificação.");
    }
    
    return sugestoes;
  }
  
  /**
   * Sugestões de otimização de produtos
   */
  private sugestoesOtimizacaoProdutos(): string[] {
    const sugestoes: string[] = [];
    const padroesProdutos = this.learning.aprenderPadraoProdutos();
    
    // Identificar produtos com potencial
    const produtosComPotencial: ProductTrend[] = [];
    
    this.atual.produtos_mais_vendidos.forEach((produto) => {
      const padrao = padroesProdutos.get(produto.produto);
      if (padrao && padrao.tendencia > 0.5) {
        const variacao = calcularVariacaoPercentual(produto.vendas, padrao.media);
        produtosComPotencial.push({
          produto: produto.produto,
          tendencia: "crescendo",
          variacao,
        });
      }
    });
    
    if (produtosComPotencial.length > 0) {
      const top = produtosComPotencial[0];
      sugestoes.push(`"${top.produto}" está em ascensão (${top.variacao.toFixed(0)}% acima da média). Destaque-o no topo do cardápio.`);
    }
    
    // Reorganização do cardápio
    if (this.atual.produtos_mais_vendidos.length >= 3 && this.atual.produtos_menos_vendidos.length >= 3) {
      sugestoes.push("Organize o cardápio: produtos mais vendidos no topo, itens com baixo giro no final ou em seções de promoções.");
    }
    
    // Produtos estagnados
    const produtosEstagnados = this.atual.produtos_menos_vendidos.filter(p => p.vendas < 15);
    if (produtosEstagnados.length >= 2) {
      sugestoes.push(`Produtos estagnados detectados. Crie combos atrativos incluindo: ${produtosEstagnados.slice(0, 2).map(p => p.produto).join(", ")}.`);
    }
    
    // Preço vs demanda
    const mediaVendasTop = this.atual.produtos_mais_vendidos.slice(0, 3).reduce((sum, p) => sum + p.vendas, 0) / 3;
    const mediaVendasBottom = this.atual.produtos_menos_vendidos.slice(0, 3).reduce((sum, p) => sum + p.vendas, 0) / 3;
    
    if (mediaVendasTop > mediaVendasBottom * 10) {
      sugestoes.push("Grande disparidade entre produtos. Revise preços e apresentação dos itens com baixa saída.");
    }
    
    return sugestoes;
  }
}
