/**
 * Error sanitization utility to prevent information leakage
 * Maps database/auth errors to user-friendly messages
 */

const errorMap: Record<string, string> = {
  "Invalid login credentials": "Email ou senha incorretos",
  "Email not confirmed": "Email não confirmado. Verifique sua caixa de entrada.",
  "User already registered": "Este email já está cadastrado",
  "already registered": "Este email já está em uso",
  "Password should be at least": "Senha muito curta. Use pelo menos 6 caracteres",
  "Signup is disabled": "Cadastro temporariamente indisponível",
  "violates row-level security": "Você não tem permissão para esta ação",
  "row-level security policy": "Acesso negado",
  "violates foreign key": "Erro ao processar. Verifique os dados informados",
  "violates unique constraint": "Este registro já existe",
  "violates check constraint": "Dados inválidos. Verifique as informações",
  "violates not-null constraint": "Dados obrigatórios não informados",
  "Failed to fetch": "Erro de conexão. Verifique sua internet",
  "Network error": "Erro de rede. Tente novamente",
  "timeout": "Tempo esgotado. Tente novamente",
  "duplicate key": "Este registro já existe",
  "value too long": "Texto muito longo",
  "invalid input syntax": "Formato de dado inválido",
};

export function sanitizeError(error: unknown): string {
  const message = getErrorMessage(error);
  
  for (const [pattern, userMessage] of Object.entries(errorMap)) {
    if (message.toLowerCase().includes(pattern.toLowerCase())) {
      if (import.meta.env.DEV) {
        console.error("Database error:", error);
      }
      return userMessage;
    }
  }
  
  console.error("Unexpected error:", error);
  return "Erro ao processar solicitação. Tente novamente.";
}

function getErrorMessage(error: unknown): string {
  if (typeof error === "string") return error;
  if (error instanceof Error) return error.message;
  if (error && typeof error === "object") {
    if ("message" in error && typeof error.message === "string") return error.message;
    if ("details" in error && typeof error.details === "string") return error.details;
    if ("error" in error) return getErrorMessage(error.error);
  }
  return "Erro desconhecido";
}

export function isAuthError(error: unknown): boolean {
  const message = getErrorMessage(error).toLowerCase();
  return message.includes("invalid login") || message.includes("not confirmed") || message.includes("already registered") || message.includes("password");
}

export function isPermissionError(error: unknown): boolean {
  const message = getErrorMessage(error).toLowerCase();
  return message.includes("row-level security") || message.includes("permission denied") || message.includes("access denied");
}
