import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface AIResponse {
  response?: string;
  context?: {
    healthScore: number;
    alerts: string[];
  };
  error?: string;
  detail?: string;
}

export function useFinancialAI() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendMessage = useCallback(
    async (message: string) => {
      setIsLoading(true);
      setError(null);

      const userMessage: Message = { role: "user", content: message };
      setMessages((prev) => [...prev, userMessage]);

      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session) {
          throw new Error("Você precisa estar logado para usar o chat");
        }

        const { data, error } = await supabase.functions.invoke<AIResponse>(
          "financial-ai-chat",
          {
            body: {
              message,
              conversationHistory: messages,
            },
          }
        );

        if (error) {
          const msg = error.message || "Erro ao processar mensagem";
          setError(msg);
          // remover mensagem do usuário se falhar
          setMessages((prev) => prev.filter((m) => m !== userMessage));
          throw error;
        }

        if (data?.error) {
          const msg = data.error || "Erro ao processar mensagem";
          setError(msg);
          setMessages((prev) => prev.filter((m) => m !== userMessage));
          throw new Error(msg);
        }

        const assistantText =
          data?.response || "Não consegui gerar uma resposta no momento.";

        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: assistantText },
        ]);

        return data;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Erro desconhecido";
        setError(errorMessage);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [messages]
  );

  const clearMessages = useCallback(() => {
    setMessages([]);
    setError(null);
  }, []);

  return { messages, isLoading, error, sendMessage, clearMessages };
}
