import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Formata número de telefone brasileiro para o formato do WhatsApp
 * Entrada: "85999998888" ou "5585999998888" ou "+5585999998888"
 * Saída: "+5585999998888"
 */
export function formatPhoneToWhatsApp(phone: string): string {
  // Remove tudo que não for número
  const numbers = phone.replace(/\D/g, "");
  
  // Se já começa com 55 (código do Brasil), apenas adiciona o +
  if (numbers.startsWith("55") && numbers.length >= 12) {
    return `+${numbers}`;
  }
  
  // Se não tem o código do país, adiciona +55
  if (numbers.length >= 10) {
    return `+55${numbers}`;
  }
  
  return phone; // Retorna original se não conseguir formatar
}

/**
 * Valida se o número brasileiro é válido (10 ou 11 dígitos com DDD)
 */
export function validateBrazilianPhone(phone: string): boolean {
  const numbers = phone.replace(/\D/g, "");
  
  // Remove o código do país se tiver
  const localNumber = numbers.startsWith("55") ? numbers.substring(2) : numbers;
  
  // Deve ter 10 dígitos (fixo) ou 11 dígitos (celular com 9)
  return localNumber.length === 10 || localNumber.length === 11;
}
