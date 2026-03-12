import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Phone, MessageSquare, Edit, Trash2, Send, Clock, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { PIPELINE_STAGES, type CRMLead } from "./CRMKanban";

interface Interaction {
  id: string;
  interaction_type: string;
  content: string;
  created_at: string;
}

interface LeadDetailSheetProps {
  lead: CRMLead | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: () => void;
  onEdit: (lead: CRMLead) => void;
  onDelete: (leadId: string) => void;
}

const INTERACTION_TYPES = [
  { value: "call", label: "Ligação" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "meeting", label: "Reunião" },
  { value: "email", label: "Email" },
  { value: "note", label: "Nota" },
];

const LeadDetailSheet = ({ lead, open, onOpenChange, onUpdate, onEdit, onDelete }: LeadDetailSheetProps) => {
  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [newContent, setNewContent] = useState("");
  const [newType, setNewType] = useState("note");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (lead && open) fetchInteractions();
  }, [lead, open]);

  const fetchInteractions = async () => {
    if (!lead) return;
    const { data } = await supabase
      .from("crm_interactions")
      .select("*")
      .eq("lead_id", lead.id)
      .order("created_at", { ascending: false });
    if (data) setInteractions(data);
  };

  const addInteraction = async () => {
    if (!lead || !newContent.trim()) return;
    setLoading(true);
    const { error } = await supabase.from("crm_interactions").insert({
      lead_id: lead.id,
      interaction_type: newType,
      content: newContent.trim(),
    });
    if (error) {
      toast.error("Erro ao adicionar interação");
    } else {
      toast.success("Interação registrada");
      setNewContent("");
      fetchInteractions();
    }
    setLoading(false);
  };

  if (!lead) return null;

  const stage = PIPELINE_STAGES.find(s => s.key === lead.stage);
  const trialDaysLeft = lead.trial_ends_at
    ? Math.ceil((new Date(lead.trial_ends_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center justify-between pr-4">
            <span className="truncate">{lead.restaurant_name}</span>
            <div className="flex gap-1">
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => onEdit(lead)}>
                <Edit className="h-3.5 w-3.5" />
              </Button>
              <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => { onDelete(lead.id); onOpenChange(false); }}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-4 mt-4">
          {/* Info */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge className={`${stage?.color} text-white border-0`}>{stage?.label}</Badge>
              {trialDaysLeft !== null && trialDaysLeft > 0 && (
                <Badge variant="outline"><Clock className="h-3 w-3 mr-1" />{trialDaysLeft}d</Badge>
              )}
            </div>
            <div className="text-sm space-y-1">
              <p><strong>Responsável:</strong> {lead.contact_name}</p>
              <p><strong>Telefone:</strong> {lead.phone}</p>
              {lead.email && <p><strong>Email:</strong> {lead.email}</p>}
              {lead.city && <p><strong>Cidade:</strong> {lead.city}</p>}
              {lead.lead_source && <p><strong>Origem:</strong> {lead.lead_source}</p>}
              {lead.next_follow_up && (
                <p className={new Date(lead.next_follow_up) < new Date() ? "text-destructive font-medium" : ""}>
                  <strong>Próximo contato:</strong> {format(new Date(lead.next_follow_up), "dd/MM/yyyy HH:mm")}
                </p>
              )}
              {lead.notes && <p className="text-muted-foreground">{lead.notes}</p>}
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => window.open(`https://wa.me/${lead.phone.replace(/\D/g, "")}`, "_blank")}>
                <MessageSquare className="h-3.5 w-3.5 mr-1" />WhatsApp
              </Button>
              <Button size="sm" variant="outline" onClick={() => window.open(`tel:${lead.phone}`, "_blank")}>
                <Phone className="h-3.5 w-3.5 mr-1" />Ligar
              </Button>
            </div>
          </div>

          <Separator />

          {/* Add interaction */}
          <div className="space-y-2">
            <h4 className="text-sm font-semibold">Nova Interação</h4>
            <Select value={newType} onValueChange={setNewType}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {INTERACTION_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <div className="flex gap-2">
              <Textarea rows={2} placeholder="Descreva o contato..." value={newContent} onChange={(e) => setNewContent(e.target.value)} className="text-sm" />
              <Button size="icon" className="shrink-0 self-end" disabled={loading || !newContent.trim()} onClick={addInteraction}>
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <Separator />

          {/* History */}
          <div className="space-y-2">
            <h4 className="text-sm font-semibold">Histórico</h4>
            {interactions.length === 0 && <p className="text-xs text-muted-foreground">Nenhuma interação registrada.</p>}
            {interactions.map(i => {
              const typeLabel = INTERACTION_TYPES.find(t => t.value === i.interaction_type)?.label || i.interaction_type;
              return (
                <div key={i.id} className="border rounded-md p-2 space-y-1">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className="text-[10px]">{typeLabel}</Badge>
                    <span className="text-[10px] text-muted-foreground">{format(new Date(i.created_at), "dd/MM/yy HH:mm")}</span>
                  </div>
                  <p className="text-xs">{i.content}</p>
                </div>
              );
            })}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default LeadDetailSheet;
