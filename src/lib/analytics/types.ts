export interface HistoricalData {
  semanas: number;
  pedidos: number[];
  cancelamentos: number[];
  abandonos: number[];
  conversao: number[];
  produtos: {
    mais_vendidos: Array<{ produto: string; vendas: number[] }>;
    menos_vendidos: Array<{ produto: string; vendas: number[] }>;
  };
}

export interface CurrentData {
  pedidos_total: number;
  cancelamentos: number;
  abandonos: number;
  conversao: number;
  produtos_mais_vendidos: Array<{ produto: string; vendas: number }>;
  produtos_menos_vendidos: Array<{ produto: string; vendas: number }>;
}

export interface AnalysisInput {
  historico: HistoricalData;
  dados_atual: CurrentData;
}

export interface Problem {
  alerta: boolean;
  tipo: string;
  gravidade: "baixa" | "média" | "alta" | "crítica";
  mensagem: string;
  sugestao: string;
  impacto_estimado?: string;
}

export interface Trend {
  status: "subindo" | "descendo" | "estável";
  variacao_percentual: number;
  confianca: number;
}

export interface ProductTrend {
  produto: string;
  tendencia: "crescendo" | "caindo" | "estável";
  variacao: number;
}

export interface AnalysisOutput {
  problemas_detectados: Problem[];
  sugestoes_personalizadas: string[];
  tendencias: {
    abandonos: Trend;
    conversao: Trend;
    pedidos: Trend;
    cancelamentos: Trend;
    produtos: {
      crescendo: ProductTrend[];
      caindo: ProductTrend[];
      estaveis: ProductTrend[];
    };
  };
  metricas_aprendidas: {
    media_abandonos: number;
    media_conversao: number;
    media_cancelamentos: number;
    desvio_padrao_abandonos: number;
    desvio_padrao_conversao: number;
  };
}

export interface LearningMetrics {
  media: number;
  desvio_padrao: number;
  tendencia: number;
  limite_superior: number;
  limite_inferior: number;
}
