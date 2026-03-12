import { useState, useEffect, useCallback } from "react";
import { Navigate } from "react-router-dom";
import DashboardLayout from "@/components/DashboardLayout";
import { useAdminCheck } from "@/hooks/useAdminCheck";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search } from "lucide-react";
import CRMKanban, { type CRMLead } from "@/components/crm/CRMKanban";
import CRMDashboard from "@/components/crm/CRMDashboard";
import LeadFormDialog from "@/components/crm/LeadFormDialog";
import LeadDetailSheet from "@/components/crm/LeadDetailSheet";

const CRM = () => {
  const [leads, setLeads] = useState<CRMLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingLead, setEditingLead] = useState<CRMLead | null>(null);
  const [selectedLead, setSelectedLead] = useState<CRMLead | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const fetchLeads = useCallback(async () => {
    const { data, error } = await supabase
      .from("crm_leads")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      toast.error("Erro ao carregar leads");
    } else {
      setLeads(data || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchLeads(); }, [fetchLeads]);

  const handleSave = async (formData: any) => {
    if (editingLead) {
      const { error } = await supabase.from("crm_leads").update(formData).eq("id", editingLead.id);
      if (error) toast.error("Erro ao atualizar lead");
      else toast.success("Lead atualizado!");
    } else {
      const { error } = await supabase.from("crm_leads").insert(formData);
      if (error) toast.error("Erro ao criar lead");
      else toast.success("Lead cadastrado!");
    }
    setEditingLead(null);
    fetchLeads();
  };

  const handleMoveLead = async (leadId: string, newStage: string) => {
    const updateData: any = { stage: newStage };
    if (newStage === "trial_active") {
      updateData.trial_started_at = new Date().toISOString();
      updateData.trial_ends_at = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    }
    if (newStage === "closed_won") {
      updateData.converted_at = new Date().toISOString();
    }
    const { error } = await supabase.from("crm_leads").update(updateData).eq("id", leadId);
    if (error) toast.error("Erro ao mover lead");
    else {
      if (newStage === "closed_won") toast.success("🎉 Lead convertido em cliente!");
      fetchLeads();
    }
  };

  const handleDelete = async (leadId: string) => {
    const { error } = await supabase.from("crm_leads").delete().eq("id", leadId);
    if (error) toast.error("Erro ao excluir lead");
    else { toast.success("Lead excluído"); fetchLeads(); }
  };

  const filteredLeads = search
    ? leads.filter(l =>
        l.restaurant_name.toLowerCase().includes(search.toLowerCase()) ||
        l.contact_name.toLowerCase().includes(search.toLowerCase()) ||
        l.phone.includes(search)
      )
    : leads;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">CRM</h1>
            <p className="text-sm text-muted-foreground">Gerencie seus leads e acompanhe o funil de vendas</p>
          </div>
          <Button onClick={() => { setEditingLead(null); setShowForm(true); }}>
            <Plus className="h-4 w-4 mr-1" />Novo Lead
          </Button>
        </div>

        <CRMDashboard leads={leads} />

        <div className="relative max-w-xs">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar lead..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8" />
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent" />
          </div>
        ) : (
          <CRMKanban
            leads={filteredLeads}
            onMoveLead={handleMoveLead}
            onSelectLead={(lead) => { setSelectedLead(lead); setDetailOpen(true); }}
          />
        )}

        <LeadFormDialog
          open={showForm}
          onOpenChange={setShowForm}
          lead={editingLead}
          onSave={handleSave}
        />

        <LeadDetailSheet
          lead={selectedLead}
          open={detailOpen}
          onOpenChange={setDetailOpen}
          onUpdate={fetchLeads}
          onEdit={(lead) => { setEditingLead(lead); setShowForm(true); setDetailOpen(false); }}
          onDelete={handleDelete}
        />
      </div>
    </DashboardLayout>
  );
};

export default CRM;
