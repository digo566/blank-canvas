import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface AnalyticsData {
  pedidos_total: number;
  cancelamentos: number;
  abandonos: number;
  produtos_mais_vendidos: Array<{ produto: string; vendas: number }>;
  produtos_menos_vendidos: Array<{ produto: string; vendas: number }>;
}

interface AnalyticsAIResponse {
  response?: string;
  error?: string;
  detail?: string;
}

export function useAnalyticsAI(analyticsData: AnalyticsData | null) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const sendMessage = useCallback(
    async (userMessage: string) => {
      if (!userMessage.trim() || isLoading) return;

      const newUserMessage: Message = { role: "user", content: userMessage };
      setMessages((prev) => [...prev, newUserMessage]);
      setIsLoading(true);

      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session) {
          toast.error("Você precisa estar logado");
          setIsLoading(false);
          return;
        }

        const { data, error } = await supabase.functions.invoke<AnalyticsAIResponse>(
          "analytics-ai-chat",
          {
            body: {
              message: userMessage,
              analyticsData: analyticsData || {},
            },
          }
        );

        if (error) {
          console.error("analytics-ai-chat error:", error);
          toast.error(error.message || "Erro ao processar sua mensagem");
          // remove última mensagem do usuário se falhar
          setMessages((prev) => prev.filter((m) => m !== newUserMessage));
          return;
        }

        if (data?.error) {
          console.error("analytics-ai-chat data error:", data);
          toast.error(data.error);
          setMessages((prev) => prev.filter((m) => m !== newUserMessage));
          return;
        }

        const assistantText =
          data?.response || "Não consegui gerar uma resposta no momento.";

        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: assistantText },
        ]);
      } catch (err) {
        console.error("Analytics AI error:", err);
        toast.error("Erro ao processar sua mensagem");
        setMessages((prev) => prev.filter((m) => m !== newUserMessage));
      } finally {
        setIsLoading(false);
      }
    },
    [analyticsData, isLoading]
  );

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  return { messages, isLoading, sendMessage, clearMessages };
}
