/**
 * Error sanitization utility to prevent information leakage
 * Maps database/auth errors to user-friendly messages
 */

const errorMap: Record<string, string> = {
  // Auth errors
  "Invalid login credentials": "Email ou senha incorretos",
  "Email not confirmed": "Email não confirmado. Verifique sua caixa de entrada.",
  "User already registered": "Este email já está cadastrado",
  "already registered": "Este email já está em uso",
  "Password should be at least": "Senha muito curta. Use pelo menos 6 caracteres",
  "Signup is disabled": "Cadastro temporariamente indisponível",
  
  // RLS errors
  "violates row-level security": "Você não tem permissão para esta ação",
  "row-level security policy": "Acesso negado",
  
  // Database constraint errors
  "violates foreign key": "Erro ao processar. Verifique os dados informados",
  "violates unique constraint": "Este registro já existe",
  "violates check constraint": "Dados inválidos. Verifique as informações",
  "violates not-null constraint": "Dados obrigatórios não informados",
  
  // Network errors
  "Failed to fetch": "Erro de conexão. Verifique sua internet",
  "Network error": "Erro de rede. Tente novamente",
  "timeout": "Tempo esgotado. Tente novamente",
  
  // Generic database errors
  "duplicate key": "Este registro já existe",
  "value too long": "Texto muito longo",
  "invalid input syntax": "Formato de dado inválido",
};

/**
 * Sanitizes error messages to prevent information leakage
 * @param error - The error object or message
 * @returns A user-friendly error message
 */
export function sanitizeError(error: unknown): string {
  const message = getErrorMessage(error);
  
  // Check if error matches any known patterns
  for (const [pattern, userMessage] of Object.entries(errorMap)) {
    if (message.toLowerCase().includes(pattern.toLowerCase())) {
      // Log full error for debugging (server-side only in production)
      if (process.env.NODE_ENV === "development") {
        console.error("Database error:", error);
      }
      return userMessage;
    }
  }
  
  // Log unexpected errors for debugging
  console.error("Unexpected error:", error);
  
  // Return generic message for unknown errors
  return "Erro ao processar solicitação. Tente novamente.";
}

/**
 * Extracts error message from various error formats
 */
function getErrorMessage(error: unknown): string {
  if (typeof error === "string") {
    return error;
  }
  
  if (error instanceof Error) {
    return error.message;
  }
  
  if (error && typeof error === "object") {
    // Handle Supabase error format
    if ("message" in error && typeof error.message === "string") {
      return error.message;
    }
    // Handle PostgrestError format
    if ("details" in error && typeof error.details === "string") {
      return error.details;
    }
    // Handle nested error
    if ("error" in error) {
      return getErrorMessage(error.error);
    }
  }
  
  return "Erro desconhecido";
}

/**
 * Type guard to check if error has a specific pattern
 */
export function isAuthError(error: unknown): boolean {
  const message = getErrorMessage(error).toLowerCase();
  return (
    message.includes("invalid login") ||
    message.includes("not confirmed") ||
    message.includes("already registered") ||
    message.includes("password")
  );
}

/**
 * Type guard to check if error is a permission error
 */
export function isPermissionError(error: unknown): boolean {
  const message = getErrorMessage(error).toLowerCase();
  return (
    message.includes("row-level security") ||
    message.includes("permission denied") ||
    message.includes("access denied")
  );
}
