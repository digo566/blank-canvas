import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, FileText } from "lucide-react";

export const FiscalSettingsManager = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [fiscal, setFiscal] = useState({
    fiscal_cnpj: "",
    fiscal_razao_social: "",
    fiscal_nome_fantasia: "",
    fiscal_inscricao_municipal: "",
    fiscal_endereco: "",
  });

  useEffect(() => {
    loadFiscal();
  }, []);

  const loadFiscal = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data, error } = await supabase
        .from("profiles")
        .select("fiscal_cnpj, fiscal_razao_social, fiscal_nome_fantasia, fiscal_inscricao_municipal, fiscal_endereco")
        .eq("id", user.id)
        .single();
      if (error) throw error;
      if (data) {
        setFiscal({
          fiscal_cnpj: data.fiscal_cnpj || "",
          fiscal_razao_social: data.fiscal_razao_social || "",
          fiscal_nome_fantasia: data.fiscal_nome_fantasia || "",
          fiscal_inscricao_municipal: data.fiscal_inscricao_municipal || "",
          fiscal_endereco: data.fiscal_endereco || "",
        });
      }
    } catch {
      toast.error("Erro ao carregar dados fiscais");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { error } = await supabase
        .from("profiles")
        .update(fiscal as any)
        .eq("id", user.id);
      if (error) throw error;
      toast.success("Dados fiscais salvos!");
    } catch {
      toast.error("Erro ao salvar dados fiscais");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Dados Fiscais
        </CardTitle>
        <CardDescription>
          Preencha os dados da empresa para gerar pré-notas fiscais nos pedidos
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>CNPJ</Label>
            <Input
              value={fiscal.fiscal_cnpj}
              onChange={(e) => setFiscal({ ...fiscal, fiscal_cnpj: e.target.value })}
              placeholder="00.000.000/0000-00"
            />
          </div>
          <div className="space-y-2">
            <Label>Inscrição Municipal</Label>
            <Input
              value={fiscal.fiscal_inscricao_municipal}
              onChange={(e) => setFiscal({ ...fiscal, fiscal_inscricao_municipal: e.target.value })}
              placeholder="Inscrição municipal"
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label>Razão Social</Label>
          <Input
            value={fiscal.fiscal_razao_social}
            onChange={(e) => setFiscal({ ...fiscal, fiscal_razao_social: e.target.value })}
            placeholder="Razão social da empresa"
          />
        </div>
        <div className="space-y-2">
          <Label>Nome Fantasia</Label>
          <Input
            value={fiscal.fiscal_nome_fantasia}
            onChange={(e) => setFiscal({ ...fiscal, fiscal_nome_fantasia: e.target.value })}
            placeholder="Nome fantasia"
          />
        </div>
        <div className="space-y-2">
          <Label>Endereço</Label>
          <Input
            value={fiscal.fiscal_endereco}
            onChange={(e) => setFiscal({ ...fiscal, fiscal_endereco: e.target.value })}
            placeholder="Endereço completo"
          />
        </div>
        <Button onClick={handleSave} disabled={saving}>
          {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
          Salvar Dados Fiscais
        </Button>
      </CardContent>
    </Card>
  );
};
