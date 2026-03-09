import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, CheckCircle2, Clock, XCircle, ExternalLink, RefreshCw } from "lucide-react";
import { useAdminCheck } from "@/hooks/useAdminCheck";

interface AccountStatus {
  status: string;
  customerId: string | null;
  onboardingUrl: string | null;
  createdAt: string | null;
}

export function PaymentSettingsManager() {
  const { isAdmin, loading: adminLoading } = useAdminCheck();
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [userId, setUserId] = useState<string>("");
  const [accountStatus, setAccountStatus] = useState<AccountStatus | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: "",
    cpfCnpj: "",
    email: "",
    phone: "",
    birthDate: "",
  });

  useEffect(() => {
    if (!adminLoading && isAdmin) loadStatus();
    if (!adminLoading && !isAdmin) setLoading(false);
  }, [isAdmin, adminLoading]);

  const loadStatus = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);

      const { data, error } = await supabase.functions.invoke("asaas-account", {
        body: { action: "get-status", restaurantId: user.id },
      });
      if (error) throw error;
      setAccountStatus(data);
    } catch {
      console.error("Error loading account status");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAccount = async () => {
    if (!form.name || !form.cpfCnpj || !form.email) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }
    setCreating(true);
    try {
      const { data, error } = await supabase.functions.invoke("asaas-account", {
        body: { action: "create-account", restaurantId: userId, ...form },
      });
      if (error) throw error;
      if (data?.error) { toast.error(data.error); return; }
      toast.success("Conta financeira criada com sucesso!");
      setAccountStatus(data);
      setShowForm(false);
    } catch {
      toast.error("Erro ao criar conta financeira");
    } finally {
      setCreating(false);
    }
  };

  const handleRefreshStatus = async () => {
    setRefreshing(true);
    try {
      const { data, error } = await supabase.functions.invoke("asaas-account", {
        body: { action: "refresh-status", restaurantId: userId },
      });
      if (error) throw error;
      if (data?.status) {
        setAccountStatus((prev) => prev ? { ...prev, status: data.status } : null);
        toast.success("Status atualizado!");
      }
    } catch {
      toast.error("Erro ao atualizar status");
    } finally {
      setRefreshing(false);
    }
  };

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case "ativa":
        return <Badge className="bg-green-500/10 text-green-600 border-green-500/20"><CheckCircle2 className="w-3 h-3 mr-1" /> Ativa</Badge>;
      case "aguardando_verificacao":
        return <Badge className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20"><Clock className="w-3 h-3 mr-1" /> Aguardando Verificação</Badge>;
      default:
        return <Badge variant="outline" className="text-muted-foreground"><XCircle className="w-3 h-3 mr-1" /> Não Ativada</Badge>;
    }
  };

  if (adminLoading || loading) {
    return <Card><CardContent className="flex items-center justify-center h-32"><Loader2 className="w-6 h-6 animate-spin" /></CardContent></Card>;
  }

  if (!isAdmin) {
    return <Card><CardContent className="py-8 text-center"><p className="text-muted-foreground">Função disponível em breve para todos os restaurantes.</p></CardContent></Card>;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Recebimentos Online</CardTitle>
            <CardDescription>Ative sua conta para receber pagamentos via PIX e cartão</CardDescription>
          </div>
          {getStatusBadge(accountStatus?.status || null)}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {(!accountStatus?.status || accountStatus.status === "inactive") && (
          !showForm ? (
            <div className="text-center py-6 space-y-3">
              <p className="text-muted-foreground">Você ainda não possui conta de recebimentos ativa.</p>
              <Button onClick={() => setShowForm(true)}>Ativar Recebimentos</Button>
            </div>
          ) : (
            <div className="space-y-4 border rounded-lg p-4">
              <h4 className="font-medium">Dados do Responsável</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><Label>Nome ou Razão Social *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Nome completo ou razão social" /></div>
                <div><Label>CPF ou CNPJ *</Label><Input value={form.cpfCnpj} onChange={(e) => setForm({ ...form, cpfCnpj: e.target.value })} placeholder="000.000.000-00" /></div>
                <div><Label>Email *</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="email@exemplo.com" /></div>
                <div><Label>Telefone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="(11) 99999-9999" /></div>
                <div><Label>Data de Nascimento *</Label><Input type="date" value={form.birthDate} onChange={(e) => setForm({ ...form, birthDate: e.target.value })} /></div>
              </div>
              <div className="flex gap-2">
                <Button onClick={handleCreateAccount} disabled={creating}>{creating && <Loader2 className="w-4 h-4 animate-spin mr-2" />}Criar Conta Financeira</Button>
                <Button variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
              </div>
            </div>
          )
        )}

        {accountStatus?.status === "aguardando_verificacao" && (
          <div className="space-y-4">
            <div className="p-4 bg-yellow-500/5 border border-yellow-500/20 rounded-lg space-y-2">
              <p className="font-medium text-yellow-700">Conta criada. Verificação necessária.</p>
              <p className="text-sm text-muted-foreground">Complete o cadastro financeiro para começar a receber pagamentos (conta bancária ou chave PIX).</p>
            </div>
            <div className="flex gap-2">
              {accountStatus.onboardingUrl && (
                <Button asChild><a href={accountStatus.onboardingUrl} target="_blank" rel="noopener noreferrer"><ExternalLink className="w-4 h-4 mr-2" />Completar Cadastro Financeiro</a></Button>
              )}
              <Button variant="outline" onClick={handleRefreshStatus} disabled={refreshing}>
                {refreshing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <RefreshCw className="w-4 h-4 mr-2" />}Verificar Status
              </Button>
            </div>
          </div>
        )}

        {accountStatus?.status === "ativa" && (
          <div className="p-4 bg-green-500/5 border border-green-500/20 rounded-lg space-y-2">
            <p className="font-medium text-green-700">Conta ativa para receber pagamentos!</p>
            <p className="text-sm text-muted-foreground">Você pode receber pagamentos via PIX e cartão de crédito.</p>
            {accountStatus.createdAt && <p className="text-xs text-muted-foreground">Ativada em: {new Date(accountStatus.createdAt).toLocaleDateString("pt-BR")}</p>}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
