import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PIPELINE_STAGES, type CRMLead } from "./CRMKanban";

interface LeadFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lead?: CRMLead | null;
  onSave: (data: any) => void;
}

const LEAD_SOURCES = ["Manual", "Site", "WhatsApp", "Indicação", "Instagram", "Facebook", "Google", "Outro"];

const LeadFormDialog = ({ open, onOpenChange, lead, onSave }: LeadFormDialogProps) => {
  const [form, setForm] = useState({
    restaurant_name: lead?.restaurant_name || "",
    contact_name: lead?.contact_name || "",
    phone: lead?.phone || "",
    email: lead?.email || "",
    city: lead?.city || "",
    lead_source: lead?.lead_source || "Manual",
    stage: lead?.stage || "captured",
    notes: lead?.notes || "",
    next_follow_up: lead?.next_follow_up ? lead.next_follow_up.slice(0, 16) : "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...form,
      next_follow_up: form.next_follow_up || null,
      email: form.email || null,
      city: form.city || null,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{lead ? "Editar Lead" : "Novo Lead"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <Label>Nome do Restaurante *</Label>
            <Input required value={form.restaurant_name} onChange={(e) => setForm(f => ({ ...f, restaurant_name: e.target.value }))} />
          </div>
          <div>
            <Label>Nome do Responsável *</Label>
            <Input required value={form.contact_name} onChange={(e) => setForm(f => ({ ...f, contact_name: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label>Telefone / WhatsApp *</Label>
              <Input required value={form.phone} onChange={(e) => setForm(f => ({ ...f, phone: e.target.value }))} />
            </div>
            <div>
              <Label>Email</Label>
              <Input type="email" value={form.email} onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label>Cidade</Label>
              <Input value={form.city} onChange={(e) => setForm(f => ({ ...f, city: e.target.value }))} />
            </div>
            <div>
              <Label>Origem</Label>
              <Select value={form.lead_source} onValueChange={(v) => setForm(f => ({ ...f, lead_source: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {LEAD_SOURCES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Etapa do Funil</Label>
            <Select value={form.stage} onValueChange={(v) => setForm(f => ({ ...f, stage: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {PIPELINE_STAGES.map(s => <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Próximo Follow-up</Label>
            <Input type="datetime-local" value={form.next_follow_up} onChange={(e) => setForm(f => ({ ...f, next_follow_up: e.target.value }))} />
          </div>
          <div>
            <Label>Observações</Label>
            <Textarea rows={3} value={form.notes} onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))} />
          </div>
          <Button type="submit" className="w-full">{lead ? "Salvar" : "Cadastrar Lead"}</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default LeadFormDialog;
