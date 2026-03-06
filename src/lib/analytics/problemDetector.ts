import { Problem, HistoricalData, CurrentData } from "./types";
import { LearningEngine } from "./learningEngine";
import { detectarAnomalia, calcularVariacaoPercentual } from "./dataAnalyzer";

/**
 * Detector Inteligente de Problemas
 * Analisa dados e identifica problemas automaticamente
 */
export class ProblemDetector {
  private learning: LearningEngine;
  private historico: HistoricalData;
  private atual: CurrentData;
  
  constructor(learning: LearningEngine, historico: HistoricalData, atual: CurrentData) {
    this.learning = learning;
    this.historico = historico;
    this.atual = atual;
  }
  
  /**
   * Detecta todos os problemas
   */
  detectarProblemas(): Problem[] {
    const problemas: Problem[] = [];
    
    // Verificar abandono de carrinho
    problemas.push(...this.verificarAbandono());
    
    // Verificar conversão
    problemas.push(...this.verificarConversao());
    
    // Verificar cancelamentos
    problemas.push(...this.verificarCancelamentos());
    
    // Verificar produtos com queda
    problemas.push(...this.verificarProdutosComQueda());
    
    // Verificar produtos sem giro
    problemas.push(...this.verificarProdutosSemGiro());
    
    // Verificar queda de pedidos
    problemas.push(...this.verificarQuedaPedidos());
    
    return problemas;
  }
  
  private verificarAbandono(): Problem[] {
    const problemas: Problem[] = [];
    const desvio = this.learning.getDesvioPercentual("abandonos");
    const anomalia = detectarAnomalia(this.atual.abandonos, this.learning.metricasAbandonos);
    
    if (anomalia.isAnomalia && desvio > 0) {
      problemas.push({
        alerta: true,
        tipo: "abandono_acima_do_padrao",
        gravidade: anomalia.gravidade,
        mensagem: `O abandono de carrinho está ${desvio.toFixed(1)}% acima do seu padrão histórico (${this.learning.metricasAbandonos.media.toFixed(1)}%).`,
        sugestao: "Revise fotos, descrições e preços dos produtos. Considere simplificar o processo de checkout.",
        impacto_estimado: "Alto - pode representar perda significativa de receita",
      });
    }
    
    return problemas;
  }
  
  private verificarConversao(): Problem[] {
    const problemas: Problem[] = [];
    const desvio = this.learning.getDesvioPercentual("conversao");
    const anomalia = detectarAnomalia(this.atual.conversao, this.learning.metricasConversao);
    
    if (anomalia.isAnomalia && desvio < 0) {
      problemas.push({
        alerta: true,
        tipo: "conversao_abaixo_do_padrao",
        gravidade: anomalia.gravidade,
        mensagem: `A taxa de conversão caiu ${Math.abs(desvio).toFixed(1)}% abaixo da sua média (${this.learning.metricasConversao.media.toFixed(2)}%).`,
        sugestao: "Analise a jornada do cliente. Destaque promoções e produtos populares no topo do cardápio.",
        impacto_estimado: "Médio - afeta diretamente as vendas",
      });
    }
    
    return problemas;
  }
  
  private verificarCancelamentos(): Problem[] {
    const problemas: Problem[] = [];
    const desvio = this.learning.getDesvioPercentual("cancelamentos");
    const anomalia = detectarAnomalia(this.atual.cancelamentos, this.learning.metricasCancelamentos);
    
    if (anomalia.isAnomalia && desvio > 0) {
      const taxaCancelamento = (this.atual.cancelamentos / this.atual.pedidos_total) * 100;
      
      problemas.push({
        alerta: true,
        tipo: "cancelamentos_elevados",
        gravidade: anomalia.gravidade,
        mensagem: `Cancelamentos ${desvio.toFixed(1)}% acima do normal. Taxa atual: ${taxaCancelamento.toFixed(1)}%.`,
        sugestao: "Investigue motivos dos cancelamentos. Verifique tempo de preparo, qualidade e comunicação com clientes.",
        impacto_estimado: "Alto - afeta reputação e faturamento",
      });
    }
    
    return problemas;
  }
  
  private verificarProdutosComQueda(): Problem[] {
    const problemas: Problem[] = [];
    const padroesProdutos = this.learning.aprenderPadraoProdutos();
    
    // Verificar produtos mais vendidos com queda
    this.atual.produtos_mais_vendidos.forEach((produto) => {
      const padrao = padroesProdutos.get(produto.produto);
      if (padrao && produto.vendas < padrao.media * 0.7) {
        const queda = ((padrao.media - produto.vendas) / padrao.media) * 100;
        
        problemas.push({
          alerta: true,
          tipo: "produto_popular_em_queda",
          gravidade: queda > 40 ? "alta" : "média",
          mensagem: `"${produto.produto}" (produto popular) teve queda de ${queda.toFixed(0)}% nas vendas.`,
          sugestao: "Verifique se houve mudança na receita, preço ou apresentação. Considere promoções para reativar as vendas.",
          impacto_estimado: "Alto - produto chave do negócio",
        });
      }
    });
    
    return problemas;
  }
  
  private verificarProdutosSemGiro(): Problem[] {
    const problemas: Problem[] = [];
    
    // Produtos com vendas muito baixas
    const produtosSemGiro = this.atual.produtos_menos_vendidos.filter(p => p.vendas < 10);
    
    if (produtosSemGiro.length > 0 && this.historico.semanas >= 6) {
      problemas.push({
        alerta: true,
        tipo: "produtos_sem_giro",
        gravidade: "média",
        mensagem: `${produtosSemGiro.length} produto(s) com vendas muito baixas há ${this.historico.semanas} semanas.`,
        sugestao: `Produtos parados: ${produtosSemGiro.map(p => p.produto).join(", ")}. Considere reformular, criar combos ou remover do cardápio.`,
        impacto_estimado: "Baixo - mas ocupa espaço no estoque e cardápio",
      });
    }
    
    return problemas;
  }
  
  private verificarQuedaPedidos(): Problem[] {
    const problemas: Problem[] = [];
    
    // Comparar últimas 3 semanas com as 3 anteriores
    if (this.historico.pedidos.length >= 6) {
      const ultimasSemanas = this.historico.pedidos.slice(-3);
      const semanasAnteriores = this.historico.pedidos.slice(-6, -3);
      
      const mediaRecente = ultimasSemanas.reduce((a, b) => a + b, 0) / 3;
      const mediaAnterior = semanasAnteriores.reduce((a, b) => a + b, 0) / 3;
      
      const variacao = calcularVariacaoPercentual(mediaRecente, mediaAnterior);
      
      if (variacao < -15) {
        problemas.push({
          alerta: true,
          tipo: "queda_pedidos_recente",
          gravidade: variacao < -30 ? "crítica" : "alta",
          mensagem: `Queda de ${Math.abs(variacao).toFixed(0)}% no volume de pedidos nas últimas semanas.`,
          sugestao: "Ação urgente: revise estratégia de marketing, preços e disponibilidade de produtos. Considere promoções.",
          impacto_estimado: "Crítico - faturamento em risco",
        });
      }
    }
    
    return problemas;
  }
}
