import { useState, useRef, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAnalyticsAI } from "@/hooks/useAnalyticsAI";
import ReactMarkdown from "react-markdown";
import { 
  Send, 
  Bot, 
  User, 
  Sparkles, 
  Trash2, 
  TrendingUp,
  ShoppingCart,
  XCircle,
  Package,
  Loader2
} from "lucide-react";

interface AnalyticsData {
  pedidos_total: number;
  cancelamentos: number;
  abandonos: number;
  produtos_mais_vendidos: Array<{ produto: string; vendas: number }>;
  produtos_menos_vendidos: Array<{ produto: string; vendas: number }>;
}

interface AnalyticsAIChatProps {
  analyticsData: AnalyticsData | null;
}

const quickActions = [
  { icon: TrendingUp, label: "Analisar tendências", prompt: "Analise as tendências atuais dos meus pedidos e me dê insights sobre o desempenho" },
  { icon: ShoppingCart, label: "Reduzir abandono", prompt: "Como posso reduzir a taxa de abandono de carrinho? Me dê estratégias práticas" },
  { icon: XCircle, label: "Clientes em risco de churn", prompt: "Quais clientes estão em risco de churn (parar de pedir)? O que posso fazer para recuperá-los?" },
  { icon: Package, label: "Margem de lucro", prompt: "Minha margem de lucro caiu este mês, o que os dados dizem? Quais produtos têm melhor e pior margem?" },
];

export function AnalyticsAIChat({ analyticsData }: AnalyticsAIChatProps) {
  const [input, setInput] = useState("");
  const { messages, isLoading, sendMessage, clearMessages } = useAnalyticsAI(analyticsData);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = () => {
    if (input.trim() && !isLoading) {
      sendMessage(input);
      setInput("");
    }
  };

  const handleQuickAction = (prompt: string) => {
    if (!isLoading) {
      sendMessage(prompt);
    }
  };

  return (
    <Card className="flex flex-col h-[600px] bg-gradient-to-br from-background to-muted/20 border-primary/20">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-muted/30">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Sparkles className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold">Análise com IA</h3>
            <p className="text-xs text-muted-foreground">
              Pergunte sobre seus dados e receba insights
            </p>
          </div>
        </div>
        {messages.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearMessages}
            className="text-muted-foreground hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        {messages.length === 0 ? (
          <div className="space-y-6">
            <div className="text-center py-8">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-2xl mb-4">
                <Bot className="h-8 w-8 text-primary" />
              </div>
              <h4 className="font-medium mb-2">Como posso ajudar?</h4>
              <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                Faça perguntas sobre seus dados de vendas, tendências, 
                produtos e receba análises e recomendações personalizadas.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {quickActions.map((action, i) => (
                <Button
                  key={i}
                  variant="outline"
                  className="h-auto py-3 px-4 justify-start gap-3 hover:bg-primary/5 hover:border-primary/30"
                  onClick={() => handleQuickAction(action.prompt)}
                  disabled={isLoading}
                >
                  <action.icon className="h-4 w-4 text-primary shrink-0" />
                  <span className="text-sm text-left">{action.label}</span>
                </Button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex gap-3 ${
                  msg.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                {msg.role === "assistant" && (
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Bot className="h-4 w-4 text-primary" />
                  </div>
                )}
                <div
                  className={`max-w-[80%] rounded-xl px-4 py-3 ${
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted/50"
                  }`}
                >
                  <div className="text-sm whitespace-pre-wrap prose prose-sm dark:prose-invert max-w-none">
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                  </div>
                </div>
                {msg.role === "user" && (
                  <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                    <User className="h-4 w-4" />
                  </div>
                )}
              </div>
            ))}
            {isLoading && messages[messages.length - 1]?.role === "user" && (
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Bot className="h-4 w-4 text-primary" />
                </div>
                <div className="bg-muted/50 rounded-xl px-4 py-3">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              </div>
            )}
          </div>
        )}
      </ScrollArea>

      {/* Input */}
      <div className="p-4 border-t bg-muted/20">
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Pergunte sobre seus dados..."
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
            disabled={isLoading}
            className="flex-1"
          />
          <Button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            size="icon"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </Card>
  );
}
