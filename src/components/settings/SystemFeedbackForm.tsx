import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { MessageSquarePlus, Star, Send, CheckCircle } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Feedback {
  id: string;
  category: string;
  rating: number;
  message: string;
  created_at: string;
}

const categories = [
  { value: "geral", label: "Geral" },
  { value: "pedidos", label: "Pedidos" },
  { value: "produtos", label: "Produtos" },
  { value: "clientes", label: "Clientes" },
  { value: "analytics", label: "Analytics" },
  { value: "entrega", label: "Entrega" },
  { value: "pagamentos", label: "Pagamentos" },
  { value: "sugestao", label: "Sugestão de melhoria" },
  { value: "bug", label: "Problema / Bug" },
];

export function SystemFeedbackForm() {
  const [category, setCategory] = useState("geral");
  const [rating, setRating] = useState(5);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [myFeedbacks, setMyFeedbacks] = useState<Feedback[]>([]);
  const [loadingFeedbacks, setLoadingFeedbacks] = useState(true);

  useEffect(() => {
    loadMyFeedbacks();
  }, []);

  const loadMyFeedbacks = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("system_feedback")
        .select("*")
        .eq("restaurant_id", user.id)
        .order("created_at", { ascending: false })
        .limit(5);

      if (error) throw error;
      setMyFeedbacks(data || []);
    } catch (error) {
      console.error("Erro ao carregar feedbacks:", error);
    } finally {
      setLoadingFeedbacks(false);
    }
  };

  const handleSubmit = async () => {
    if (!message.trim()) {
      toast.error("Por favor, escreva sua opinião");
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Você precisa estar logado");
        return;
      }

      const { error } = await supabase.from("system_feedback").insert({
        restaurant_id: user.id,
        category,
        rating,
        message: message.trim(),
      });

      if (error) throw error;

      toast.success("Obrigado pelo seu feedback!");
      setMessage("");
      setCategory("geral");
      setRating(5);
      loadMyFeedbacks();
    } catch (error) {
      console.error(error);
      toast.error("Erro ao enviar feedback");
    } finally {
      setLoading(false);
    }
  };

  const getCategoryLabel = (value: string) => {
    return categories.find(c => c.value === value)?.label || value;
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquarePlus className="h-5 w-5" />
            Enviar Feedback
          </CardTitle>
          <CardDescription>
            Nos ajude a melhorar o sistema! Sua opinião é muito importante.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Categoria</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Avaliação</Label>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    className="p-1 hover:scale-110 transition-transform"
                  >
                    <Star
                      className={`h-6 w-6 ${
                        star <= rating
                          ? "text-yellow-500 fill-yellow-500"
                          : "text-muted-foreground"
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Sua opinião</Label>
            <Textarea
              placeholder="Conte o que você achou do sistema, sugira melhorias, reporte problemas..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="min-h-[120px]"
            />
          </div>

          <Button onClick={handleSubmit} disabled={loading} className="w-full">
            <Send className="h-4 w-4 mr-2" />
            {loading ? "Enviando..." : "Enviar Feedback"}
          </Button>
        </CardContent>
      </Card>

      {myFeedbacks.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Seus últimos feedbacks</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {myFeedbacks.map((fb) => (
                <div
                  key={fb.id}
                  className="p-3 rounded-lg bg-muted/50 border border-border"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span className="text-sm font-medium">
                        {getCategoryLabel(fb.category)}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={`h-3 w-3 ${
                            star <= fb.rating
                              ? "text-yellow-500 fill-yellow-500"
                              : "text-muted-foreground"
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {fb.message}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {format(new Date(fb.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
