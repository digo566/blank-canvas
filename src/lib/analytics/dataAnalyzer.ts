export interface LearningMetrics { media: number; desvio_padrao: number; tendencia: number; limite_superior: number; limite_inferior: number; }

export function calcularMedia(valores: number[]): number { if (valores.length === 0) return 0; return valores.reduce((a, b) => a + b, 0) / valores.length; }

export function calcularDesvioPadrao(valores: number[]): number {
  if (valores.length === 0) return 0;
  const media = calcularMedia(valores);
  return Math.sqrt(valores.reduce((acc, val) => acc + Math.pow(val - media, 2), 0) / valores.length);
}

export function calcularMediaMovel(valores: number[], janela: number = 3): number[] {
  const ema: number[] = []; const k = 2 / (janela + 1);
  ema[0] = valores[0];
  for (let i = 1; i < valores.length; i++) ema[i] = valores[i] * k + ema[i - 1] * (1 - k);
  return ema;
}

export function detectarTendencia(valores: number[]): number {
  if (valores.length < 2) return 0;
  const n = valores.length; const x = Array.from({ length: n }, (_, i) => i); const y = valores;
  const somaX = x.reduce((a, b) => a + b, 0); const somaY = y.reduce((a, b) => a + b, 0);
  const somaXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0); const somaX2 = x.reduce((sum, xi) => sum + xi * xi, 0);
  return (n * somaXY - somaX * somaY) / (n * somaX2 - somaX * somaX);
}

export function calcularVariacaoPercentual(valorAtual: number, valorAnterior: number): number {
  if (valorAnterior === 0) return valorAtual > 0 ? 100 : 0;
  return ((valorAtual - valorAnterior) / valorAnterior) * 100;
}

export function aprenderPadrao(valores: number[]): LearningMetrics {
  const media = calcularMedia(valores); const desvioPadrao = calcularDesvioPadrao(valores); const tendencia = detectarTendencia(valores);
  return { media, desvio_padrao: desvioPadrao, tendencia, limite_superior: media + (desvioPadrao * 1.5), limite_inferior: Math.max(0, media - (desvioPadrao * 1.5)) };
}

export function detectarAnomalia(valorAtual: number, metricas: LearningMetrics): { isAnomalia: boolean; gravidade: "baixa" | "média" | "alta" | "crítica"; desvios: number; } {
  const desvios = Math.abs(valorAtual - metricas.media) / (metricas.desvio_padrao || 1);
  let gravidade: "baixa" | "média" | "alta" | "crítica" = "baixa";
  if (desvios > 3) gravidade = "crítica"; else if (desvios > 2) gravidade = "alta"; else if (desvios > 1.5) gravidade = "média";
  return { isAnomalia: desvios > 1.5, gravidade, desvios };
}

export function classificarTendencia(slope: number, limiar: number = 0.05): "subindo" | "descendo" | "estável" {
  if (slope > limiar) return "subindo"; if (slope < -limiar) return "descendo"; return "estável";
}

export function calcularConfiancaTendencia(valores: number[]): number {
  if (valores.length < 3) return 0;
  const media = calcularMedia(valores); const n = valores.length; const x = Array.from({ length: n }, (_, i) => i);
  const somaX = x.reduce((a, b) => a + b, 0); const somaY = valores.reduce((a, b) => a + b, 0);
  const somaXY = x.reduce((sum, xi, i) => sum + xi * valores[i], 0); const somaX2 = x.reduce((sum, xi) => sum + xi * xi, 0);
  const slope = (n * somaXY - somaX * somaY) / (n * somaX2 - somaX * somaX); const intercept = (somaY - slope * somaX) / n;
  const ssTotal = valores.reduce((sum, yi) => sum + Math.pow(yi - media, 2), 0);
  const ssRes = valores.reduce((sum, yi, i) => sum + Math.pow(yi - (slope * i + intercept), 2), 0);
  return Math.max(0, Math.min(1, 1 - (ssRes / (ssTotal || 1))));
}
