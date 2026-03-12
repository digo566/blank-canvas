import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Phone, MessageSquare, Calendar, ChevronLeft, ChevronRight, Plus, Clock } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

export interface CRMLead {
  id: string;
  restaurant_name: string;
  contact_name: string;
  phone: string;
  email: string | null;
  city: string | null;
  lead_source: string | null;
  stage: string;
  notes: string | null;
  next_follow_up: string | null;
  trial_started_at: string | null;
  trial_ends_at: string | null;
  converted_at: string | null;
  converted_user_id: string | null;
  lost_reason: string | null;
  created_at: string;
  updated_at: string;
}

export const PIPELINE_STAGES = [
  { key: "captured", label: "Lead Captado", color: "bg-blue-500" },
  { key: "first_contact", label: "Primeiro Contato", color: "bg-indigo-500" },
  { key: "interested", label: "Interessado", color: "bg-purple-500" },
  { key: "demo_done", label: "Demonstração", color: "bg-violet-500" },
  { key: "trial_active", label: "Teste Ativo", color: "bg-amber-500" },
  { key: "negotiation", label: "Negociação", color: "bg-orange-500" },
  { key: "closed_won", label: "Cliente Fechado", color: "bg-emerald-500" },
  { key: "closed_lost", label: "Perdido", color: "bg-red-500" },
];

interface CRMKanbanProps {
  leads: CRMLead[];
  onMoveLead: (leadId: string, newStage: string) => void;
  onSelectLead: (lead: CRMLead) => void;
}

const LeadCard = ({ lead, onMove, onSelect }: { lead: CRMLead; onMove: (dir: -1 | 1) => void; onSelect: () => void }) => {
  const currentIdx = PIPELINE_STAGES.findIndex(s => s.key === lead.stage);
  const isFollowUpOverdue = lead.next_follow_up && new Date(lead.next_follow_up) < new Date();
  const trialDaysLeft = lead.trial_ends_at
    ? Math.ceil((new Date(lead.trial_ends_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;

  return (
    <Card
      className={`cursor-pointer hover:shadow-md transition-shadow border-l-4 ${isFollowUpOverdue ? "border-l-destructive" : "border-l-transparent"}`}
      onClick={onSelect}
    >
      <CardContent className="p-3 space-y-2">
        <div className="font-semibold text-sm truncate">{lead.restaurant_name}</div>
        <div className="text-xs text-muted-foreground truncate">{lead.contact_name}</div>
        {lead.city && <div className="text-xs text-muted-foreground">{lead.city}</div>}
        
        <div className="flex items-center gap-1 flex-wrap">
          {lead.lead_source && (
            <Badge variant="outline" className="text-[10px] px-1 py-0">{lead.lead_source}</Badge>
          )}
          {trialDaysLeft !== null && trialDaysLeft > 0 && (
            <Badge variant="secondary" className="text-[10px] px-1 py-0">
              <Clock className="h-2.5 w-2.5 mr-0.5" />{trialDaysLeft}d teste
            </Badge>
          )}
          {trialDaysLeft !== null && trialDaysLeft <= 0 && lead.stage === "trial_active" && (
            <Badge variant="destructive" className="text-[10px] px-1 py-0">Teste expirado</Badge>
          )}
        </div>

        {lead.next_follow_up && (
          <div className={`text-[10px] flex items-center gap-1 ${isFollowUpOverdue ? "text-destructive font-medium" : "text-muted-foreground"}`}>
            <Calendar className="h-2.5 w-2.5" />
            {format(new Date(lead.next_follow_up), "dd/MM HH:mm")}
          </div>
        )}

        <div className="flex justify-between items-center pt-1">
          <div className="flex gap-1">
            <Button size="icon" variant="ghost" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); window.open(`https://wa.me/${lead.phone.replace(/\D/g, "")}`, "_blank"); }}>
              <MessageSquare className="h-3 w-3" />
            </Button>
            <Button size="icon" variant="ghost" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); window.open(`tel:${lead.phone}`, "_blank"); }}>
              <Phone className="h-3 w-3" />
            </Button>
          </div>
          <div className="flex gap-0.5">
            <Button size="icon" variant="ghost" className="h-6 w-6" disabled={currentIdx <= 0} onClick={(e) => { e.stopPropagation(); onMove(-1); }}>
              <ChevronLeft className="h-3 w-3" />
            </Button>
            <Button size="icon" variant="ghost" className="h-6 w-6" disabled={currentIdx >= PIPELINE_STAGES.length - 1} onClick={(e) => { e.stopPropagation(); onMove(1); }}>
              <ChevronRight className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const CRMKanban = ({ leads, onMoveLead, onSelectLead }: CRMKanbanProps) => {
  return (
    <div className="flex gap-3 overflow-x-auto pb-4" style={{ minHeight: 400 }}>
      {PIPELINE_STAGES.map((stage) => {
        const stageLeads = leads.filter((l) => l.stage === stage.key);
        return (
          <div key={stage.key} className="flex-shrink-0 w-64">
            <div className="flex items-center gap-2 mb-3">
              <div className={`w-2.5 h-2.5 rounded-full ${stage.color}`} />
              <h3 className="text-sm font-semibold">{stage.label}</h3>
              <Badge variant="secondary" className="ml-auto text-xs">{stageLeads.length}</Badge>
            </div>
            <div className="space-y-2 min-h-[100px] bg-muted/30 rounded-lg p-2">
              {stageLeads.map((lead) => (
                <LeadCard
                  key={lead.id}
                  lead={lead}
                  onSelect={() => onSelectLead(lead)}
                  onMove={(dir) => {
                    const idx = PIPELINE_STAGES.findIndex(s => s.key === lead.stage);
                    const newStage = PIPELINE_STAGES[idx + dir];
                    if (newStage) onMoveLead(lead.id, newStage.key);
                  }}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default CRMKanban;
