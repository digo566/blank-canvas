import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, CheckCircle2, Clock, XCircle, ExternalLink, RefreshCw } from "lucide-react";
import { useAdminCheck } from "@/hooks/useAdminCheck";

interface AccountStatus {
  status: string;
  customerId: string | null;
  onboardingUrl: string | null;
  createdAt: string | null;
}

function formatCpfCnpj(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 14);
  if (digits.length <= 11) {
    return digits
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
  }
  return digits
    .replace(/(\d{2})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1/$2")
    .replace(/(\d{4})(\d{1,2})$/, "$1-$2");
}

function isValidCpf(cpf: string): boolean {
  const digits = cpf.replace(/\D/g, "");
  if (digits.length !== 11 || /^(\d)\1{10}$/.test(digits)) return false;
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += parseInt(digits[i]) * (10 - i);
  let check = 11 - (sum % 11);
  if (check >= 10) check = 0;
  if (parseInt(digits[9]) !== check) return false;
  sum = 0;
  for (let i = 0; i < 10; i++) sum += parseInt(digits[i]) * (11 - i);
  check = 11 - (sum % 11);
  if (check >= 10) check = 0;
  return parseInt(digits[10]) === check;
}

function isValidCnpj(cnpj: string): boolean {
  const digits = cnpj.replace(/\D/g, "");
  if (digits.length !== 14 || /^(\d)\1{13}$/.test(digits)) return false;
  const weights1 = [5,4,3,2,9,8,7,6,5,4,3,2];
  const weights2 = [6,5,4,3,2,9,8,7,6,5,4,3,2];
  let sum = 0;
  for (let i = 0; i < 12; i++) sum += parseInt(digits[i]) * weights1[i];
  let check = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  if (parseInt(digits[12]) !== check) return false;
  sum = 0;
  for (let i = 0; i < 13; i++) sum += parseInt(digits[i]) * weights2[i];
  check = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  return parseInt(digits[13]) === check;
}

function formatPhone(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 10) {
    return digits.replace(/(\d{2})(\d)/, "($1) $2").replace(/(\d{4})(\d)/, "$1-$2");
  }
  return digits.replace(/(\d{2})(\d)/, "($1) $2").replace(/(\d{5})(\d)/, "$1-$2");
}

function formatCep(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 8);
  return digits.replace(/(\d{5})(\d)/, "$1-$2");
}

export function PaymentSettingsManager() {
  const { isAdmin, loading: adminLoading } = useAdminCheck();
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [userId, setUserId] = useState("");
  const [accountStatus, setAccountStatus] = useState<AccountStatus | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: "",
    cpfCnpj: "",
    email: "",
    mobilePhone: "",
    birthDate: "",
    companyType: "",
    postalCode: "",
    incomeValue: "5000",
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
    if (!form.name || !form.cpfCnpj || !form.email || !form.mobilePhone || !form.incomeValue) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }
    const cleanCpf = form.cpfCnpj.replace(/\D/g, "");
    if (cleanCpf.length !== 11 && cleanCpf.length !== 14) {
      toast.error(`CPF deve ter 11 dígitos e CNPJ 14 dígitos. Você informou ${cleanCpf.length} dígitos.`);
      return;
    }
    const cleanPhone = form.mobilePhone.replace(/\D/g, "");
    if (cleanPhone.length < 10 || cleanPhone.length > 11) {
      toast.error("Telefone inválido. Informe DDD + número.");
      return;
    }
    const cleanCep = form.postalCode.replace(/\D/g, "");
    if (form.postalCode && cleanCep.length !== 8) {
      toast.error("CEP inválido. Deve ter 8 dígitos.");
      return;
    }
    if (cleanCpf.length === 11 && !form.birthDate) {
      toast.error("Data de nascimento é obrigatória para CPF");
      return;
    }
    if (cleanCpf.length === 14 && !form.companyType) {
      toast.error("Tipo de empresa é obrigatório para CNPJ");
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
        if (data.onboardingUrl && accountStatus) {
          setAccountStatus((prev) => prev ? { ...prev, onboardingUrl: data.onboardingUrl } : null);
        }
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

  const isCnpj = form.cpfCnpj.replace(/\D/g, "").length > 11;
  const cpfDigits = form.cpfCnpj.replace(/\D/g, "").length;

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
                <div>
                  <Label>Nome ou Razão Social *</Label>
                  <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Nome completo ou razão social" />
                </div>
                <div>
                  <Label>CPF ou CNPJ *</Label>
                  <Input
                    value={form.cpfCnpj}
                    onChange={(e) => setForm({ ...form, cpfCnpj: formatCpfCnpj(e.target.value) })}
                    placeholder="000.000.000-00"
                    maxLength={18}
                  />
                  {cpfDigits > 0 && cpfDigits !== 11 && cpfDigits !== 14 && (
                    <p className="text-xs text-destructive mt-1">
                      {cpfDigits < 11 ? `Faltam ${11 - cpfDigits} dígitos para CPF` : cpfDigits < 14 ? `Faltam ${14 - cpfDigits} dígitos para CNPJ` : ""}
                    </p>
                  )}
                </div>
                <div>
                  <Label>Email *</Label>
                  <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="email@exemplo.com" />
                </div>
                <div>
                  <Label>Celular *</Label>
                  <Input
                    value={form.mobilePhone}
                    onChange={(e) => setForm({ ...form, mobilePhone: formatPhone(e.target.value) })}
                    placeholder="(85) 99999-9999"
                    maxLength={15}
                  />
                </div>
                {!isCnpj && (
                  <div>
                    <Label>Data de Nascimento *</Label>
                    <Input type="date" value={form.birthDate} onChange={(e) => setForm({ ...form, birthDate: e.target.value })} />
                  </div>
                )}
                {isCnpj && (
                  <div>
                    <Label>Tipo de Empresa *</Label>
                    <Select value={form.companyType} onValueChange={(v) => setForm({ ...form, companyType: v })}>
                      <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="MEI">MEI</SelectItem>
                        <SelectItem value="LIMITED">Limitada</SelectItem>
                        <SelectItem value="INDIVIDUAL">Individual</SelectItem>
                        <SelectItem value="ASSOCIATION">Associação</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div>
                  <Label>CEP</Label>
                  <Input
                    value={form.postalCode}
                    onChange={(e) => setForm({ ...form, postalCode: formatCep(e.target.value) })}
                    placeholder="60000-000"
                    maxLength={9}
                  />
                </div>
                <div>
                  <Label>Faturamento Mensal (R$) *</Label>
                  <Input type="number" value={form.incomeValue} onChange={(e) => setForm({ ...form, incomeValue: e.target.value })} placeholder="5000" />
                </div>
              </div>
              <div className="flex gap-2">
                <Button onClick={handleCreateAccount} disabled={creating}>
                  {creating && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                  Criar Conta Financeira
                </Button>
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
                <Button asChild>
                  <a href={accountStatus.onboardingUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="w-4 h-4 mr-2" />Completar Cadastro Financeiro
                  </a>
                </Button>
              )}
              <Button variant="outline" onClick={handleRefreshStatus} disabled={refreshing}>
                {refreshing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <RefreshCw className="w-4 h-4 mr-2" />}
                Verificar Status
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
