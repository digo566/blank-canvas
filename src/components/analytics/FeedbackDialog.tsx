import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ThumbsUp, ThumbsDown, Star } from "lucide-react";

interface FeedbackDialogProps { open: boolean; onOpenChange: (open: boolean) => void; suggestion: string; suggestionType: string; }

export function FeedbackDialog({ open, onOpenChange, suggestion, suggestionType }: FeedbackDialogProps) {
  const [rating, setRating] = useState("3"); const [wasHelpful, setWasHelpful] = useState("yes"); const [comment, setComment] = useState(""); const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { toast.error("Autentique-se"); return; }
      const { error } = await supabase.from("suggestion_feedback").insert({ restaurant_id: user.id, suggestion_type: suggestionType, suggestion_text: suggestion, rating: parseInt(rating), was_helpful: wasHelpful === "yes", feedback_comment: comment || null });
      if (error) throw error;
      toast.success("Obrigado pelo feedback!"); onOpenChange(false); setComment(""); setRating("3"); setWasHelpful("yes");
    } catch (error) { toast.error("Erro ao enviar feedback"); } finally { setLoading(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]"><DialogHeader><DialogTitle>Avaliar Sugestão</DialogTitle><DialogDescription>Seu feedback melhora as recomendações</DialogDescription></DialogHeader>
        <div className="space-y-6 py-4">
          <div><Label className="text-sm font-medium">Sugestão</Label><p className="text-sm text-muted-foreground bg-muted p-3 rounded-md">{suggestion}</p></div>
          <div className="space-y-3"><Label>Útil?</Label><RadioGroup value={wasHelpful} onValueChange={setWasHelpful}><div className="flex items-center space-x-2"><RadioGroupItem value="yes" id="yes" /><Label htmlFor="yes" className="flex items-center gap-2 cursor-pointer"><ThumbsUp className="h-4 w-4 text-green-500" />Sim</Label></div><div className="flex items-center space-x-2"><RadioGroupItem value="no" id="no" /><Label htmlFor="no" className="flex items-center gap-2 cursor-pointer"><ThumbsDown className="h-4 w-4 text-destructive" />Não</Label></div></RadioGroup></div>
          <div className="space-y-3"><Label className="flex items-center gap-2"><Star className="h-4 w-4" />Avaliação (1-5)</Label><RadioGroup value={rating} onValueChange={setRating}><div className="flex gap-2">{[1,2,3,4,5].map(n => <div key={n} className="flex items-center space-x-2"><RadioGroupItem value={n.toString()} id={`r-${n}`} /><Label htmlFor={`r-${n}`} className="cursor-pointer">{n}</Label></div>)}</div></RadioGroup></div>
          <div><Label htmlFor="comment">Comentário (opcional)</Label><Textarea id="comment" placeholder="Deixe um comentário..." value={comment} onChange={(e) => setComment(e.target.value)} className="min-h-[100px]" /></div>
        </div>
        <DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button><Button onClick={handleSubmit} disabled={loading}>{loading ? "Enviando..." : "Enviar"}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
