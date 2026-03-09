import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAdminCheck } from "@/hooks/useAdminCheck";
import { Loader2, MessageSquare, ThumbsUp, ThumbsDown, Star, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Feedback {
  id: string;
  restaurant_id: string;
  suggestion_type: string;
  suggestion_text: string;
  was_helpful: boolean | null;
  was_implemented: boolean | null;
  rating: number | null;
  feedback_comment: string | null;
  created_at: string;
}

export default function Feedbacks() {
  const navigate = useNavigate();
  const { isAdmin, loading: adminLoading } = useAdminCheck();
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!adminLoading && !isAdmin) {
      navigate("/dashboard");
      toast.error("Acesso negado");
    }
  }, [adminLoading, isAdmin, navigate]);

  useEffect(() => {
    if (isAdmin) {
      loadFeedbacks();
    }
  }, [isAdmin]);

  const loadFeedbacks = async () => {
    try {
      const { data, error } = await supabase
        .from("suggestion_feedback")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setFeedbacks(data || []);
    } catch (error) {
      console.error("Erro ao carregar feedbacks:", error);
      toast.error("Erro ao carregar feedbacks");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from("suggestion_feedback")
        .delete()
        .eq("id", id);

      if (error) throw error;
      setFeedbacks(feedbacks.filter((f) => f.id !== id));
      toast.success("Feedback removido");
    } catch (error) {
      console.error("Erro ao remover feedback:", error);
      toast.error("Erro ao remover feedback");
    }
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      sugestao_geral: "Sugestão Geral",
      problema_detectado: "Problema",
      melhoria: "Melhoria",
    };
    return labels[type] || type;
  };

  const stats = {
    total: feedbacks.length,
    helpful: feedbacks.filter((f) => f.was_helpful === true).length,
    implemented: feedbacks.filter((f) => f.was_implemented === true).length,
    avgRating: feedbacks.filter((f) => f.rating).reduce((acc, f) => acc + (f.rating || 0), 0) / 
      (feedbacks.filter((f) => f.rating).length || 1),
  };

  if (adminLoading || loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-[60vh]">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  if (!isAdmin) return null;

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-3xl font-bold">Feedbacks das Sugestões</h1>
          <p className="text-muted-foreground mt-1">
            Visualize o feedback dos restaurantes sobre as sugestões da IA
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total de Feedbacks</CardDescription>
              <CardTitle className="text-3xl">{stats.total}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Considerados Úteis</CardDescription>
              <CardTitle className="text-3xl text-green-500">{stats.helpful}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Implementados</CardDescription>
              <CardTitle className="text-3xl text-primary">{stats.implemented}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Avaliação Média</CardDescription>
              <CardTitle className="text-3xl flex items-center gap-1">
                {stats.avgRating.toFixed(1)}
                <Star className="h-5 w-5 text-yellow-500 fill-yellow-500" />
              </CardTitle>
            </CardHeader>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Todos os Feedbacks
            </CardTitle>
          </CardHeader>
          <CardContent>
            {feedbacks.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-30" />
                <p>Nenhum feedback registrado ainda</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead className="max-w-[300px]">Sugestão</TableHead>
                      <TableHead>Útil</TableHead>
                      <TableHead>Implementado</TableHead>
                      <TableHead>Avaliação</TableHead>
                      <TableHead>Comentário</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {feedbacks.map((feedback) => (
                      <TableRow key={feedback.id}>
                        <TableCell className="whitespace-nowrap">
                          {format(new Date(feedback.created_at), "dd/MM/yy HH:mm", { locale: ptBR })}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">{getTypeLabel(feedback.suggestion_type)}</Badge>
                        </TableCell>
                        <TableCell className="max-w-[300px] truncate" title={feedback.suggestion_text}>
                          {feedback.suggestion_text}
                        </TableCell>
                        <TableCell>
                          {feedback.was_helpful === true && <ThumbsUp className="h-4 w-4 text-green-500" />}
                          {feedback.was_helpful === false && <ThumbsDown className="h-4 w-4 text-destructive" />}
                          {feedback.was_helpful === null && <span className="text-muted-foreground">-</span>}
                        </TableCell>
                        <TableCell>
                          {feedback.was_implemented ? (
                            <Badge variant="default">Sim</Badge>
                          ) : (
                            <span className="text-muted-foreground">Não</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {feedback.rating ? (
                            <div className="flex items-center gap-1">
                              {feedback.rating}
                              <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate" title={feedback.feedback_comment || ""}>
                          {feedback.feedback_comment || "-"}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(feedback.id)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
