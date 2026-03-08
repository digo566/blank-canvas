import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CreditCard, QrCode, FileText, Eye, EyeOff, CheckCircle2, Copy, AlertTriangle } from "lucide-react";
import grapeLogo from "@/assets/grape-logo.png";
import { useSubscriptionContext } from "@/contexts/SubscriptionContext";

const PRICE = 250;

const Subscription = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { hasActiveSubscription, isOnTrial, trialDaysLeft, checkSubscription } = useSubscriptionContext();
  const [step, setStep] = useState<"form" | "payment" | "success">("form");
  const [loading, setLoading] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [billingType, setBillingType] = useState("PIX");
  const [paymentInfo, setPaymentInfo] = useState<any>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [checkingPayment, setCheckingPayment] = useState(false);
  const [formData, setFormData] = useState({
    restaurantName: searchParams.get("restaurant") || "",
    password: "",
    name: searchParams.get("name") || "",
    cpfCnpj: "",
    email: searchParams.get("email") || "",
    phone: searchParams.get("phone") || "",
    cardNumber: "",
    cardHolder: "",
    cardExpMonth: "",
    cardExpYear: "",
    cardCcv: "",
    postalCode: "",
    addressNumber: "",
  });

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      const user = session?.user;
      setIsLoggedIn(!!user);
      if (user?.email) {
        setFormData(prev => ({ ...prev, email: user.email || "" }));
      }
      if (user) {
        const { data: roles } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .eq("role", "admin");
        if (roles && roles.length > 0) {
          navigate("/dashboard");
          return;
        }
      }
      setCheckingAuth(false);
    });
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.cpfCnpj || !formData.email) {
      toast.error("Preencha nome, CPF/CNPJ e email");
      return;
    }
    if (!isLoggedIn) {
      if (!formData.restaurantName) { toast.error("Preencha o nome do restaurante"); return; }
      if (!formData.password || formData.password.length < 6) { toast.error("A senha deve ter no mínimo 6 caracteres"); return; }
      if (!formData.phone) { toast.error("Preencha o telefone"); return; }
    }
    if (billingType === "CREDIT_CARD") {
      if (!formData.cardNumber || !formData.cardHolder || !formData.cardExpMonth || !formData.cardExpYear || !formData.cardCcv) {
        toast.error("Preencha todos os dados do cartão"); return;
      }
    }

    setLoading(true);
    try {
      if (!isLoggedIn) {
        let normalizedPhone = formData.phone.replace(/\D/g, "");
        if (!normalizedPhone.startsWith("55")) normalizedPhone = "55" + normalizedPhone;
        const { data: signupData, error: signupError } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
          options: {
            emailRedirectTo: `${window.location.origin}/dashboard`,
            data: { restaurant_name: formData.restaurantName, phone: `+${normalizedPhone}` },
          },
        });
        if (signupError) { toast.error(signupError.message); setLoading(false); return; }
        if (!signupData.user) { toast.error("Erro ao criar conta"); setLoading(false); return; }
        setIsLoggedIn(true);
        toast.success("Conta criada! Processando pagamento...");
      }

      const payload: Record<string, unknown> = {
        action: "create-subscription",
        name: formData.name,
        cpfCnpj: formData.cpfCnpj,
        email: formData.email,
        phone: formData.phone,
        billingType,
      };
      if (billingType === "CREDIT_CARD") {
        payload.creditCard = {
          holderName: formData.cardHolder,
          number: formData.cardNumber.replace(/\D/g, ""),
          expiryMonth: formData.cardExpMonth,
          expiryYear: formData.cardExpYear,
          ccv: formData.cardCcv,
        };
        payload.postalCode = formData.postalCode;
        payload.addressNumber = formData.addressNumber;
      }

      const { data, error } = await supabase.functions.invoke("asaas-subscription", { body: payload });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setPaymentInfo(data.paymentInfo);
      if (billingType === "CREDIT_CARD" && data.status === "active") {
        toast.success("Assinatura ativada com sucesso!");
        await checkSubscription();
        setStep("success");
      } else if (billingType === "CREDIT_CARD") {
        toast.error("Pagamento não confirmado. Verifique os dados do cartão.");
      } else {
        setStep("payment");
      }
    } catch (err: any) {
      console.error("Subscription error:", err);
      toast.error(err.message || "Erro ao criar assinatura");
    } finally {
      setLoading(false);
    }
  };

  const handleCheckPayment = async () => {
    if (!paymentInfo?.paymentId) return;
    setCheckingPayment(true);
    try {
      const { data, error } = await supabase.functions.invoke("asaas-subscription", {
        body: { action: "check-payment", paymentId: paymentInfo.paymentId },
      });
      if (error) throw error;
      if (data?.confirmed) {
        toast.success("Pagamento confirmado! Seu acesso foi liberado.");
        await checkSubscription();
        setStep("success");
      } else {
        toast.info("Pagamento ainda não confirmado. Tente novamente em alguns instantes.");
      }
    } catch (err: any) {
      toast.error("Erro ao verificar pagamento");
    } finally {
      setCheckingPayment(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copiado!");
  };

  if (checkingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  const isExpired = isLoggedIn && !hasActiveSubscription && !isOnTrial;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-8">
          <img src={grapeLogo} alt="Grape" className="w-20 h-20 mx-auto mb-4 object-contain" />

          {isExpired && (
            <div className="mb-4 p-4 rounded-lg border border-destructive/50 bg-destructive/10">
              <AlertTriangle className="h-8 w-8 mx-auto text-destructive mb-2" />
              <h2 className="text-lg font-bold text-destructive">Seu plano expirou</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Para continuar usando a Grape e manter sua loja ativa, renove sua assinatura abaixo.
              </p>
            </div>
          )}

          <h1 className="text-2xl font-bold text-foreground">
            {isExpired ? "Renove sua Assinatura" : isLoggedIn ? "Ative sua Assinatura" : "Crie sua conta e Assine"}
          </h1>
          <p className="text-muted-foreground mt-2">
            {isExpired
              ? "Seu acesso será reativado imediatamente após a confirmação do pagamento."
              : isLoggedIn
              ? "Para acessar o painel e ativar sua loja, assine o plano Grape."
              : "Preencha seus dados, crie sua conta e ative sua loja em um só passo."}
          </p>
          {isOnTrial && (
            <p className="text-sm text-amber-600 mt-2">
              ⏳ Você ainda tem {trialDaysLeft} {trialDaysLeft === 1 ? "dia" : "dias"} grátis, mas pode assinar agora!
            </p>
          )}
          <p className="text-2xl font-bold text-primary mt-3">R$ {PRICE},00/mês</p>
        </div>

        {step === "form" && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                {isLoggedIn ? "Dados para Assinatura" : "Cadastro + Assinatura"}
              </CardTitle>
              <CardDescription>
                {isLoggedIn ? "Preencha seus dados para gerar o pagamento" : "Crie sua conta e gere o pagamento de uma vez"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                {!isLoggedIn && (
                  <div className="space-y-3 border-b pb-4">
                    <Label className="text-base font-semibold">Dados da Conta</Label>
                    <div className="space-y-2">
                      <Label>Nome do Restaurante</Label>
                      <Input placeholder="Meu Restaurante" value={formData.restaurantName} onChange={(e) => setFormData({ ...formData, restaurantName: e.target.value })} required />
                    </div>
                    <div className="space-y-2">
                      <Label>Senha</Label>
                      <div className="relative">
                        <Input type={showPassword ? "text" : "password"} placeholder="Mínimo 6 caracteres" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} required minLength={6} />
                        <Button type="button" variant="ghost" size="icon" className="absolute right-0 top-0 h-full" onClick={() => setShowPassword(!showPassword)}>
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Nome Completo</Label>
                  <Input placeholder="Seu nome" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
                </div>
                <div className="space-y-2">
                  <Label>CPF ou CNPJ</Label>
                  <Input placeholder="000.000.000-00" value={formData.cpfCnpj} onChange={(e) => setFormData({ ...formData, cpfCnpj: e.target.value })} required />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input type="email" placeholder="seu@email.com" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} required disabled={isLoggedIn} />
                </div>
                <div className="space-y-2">
                  <Label>Telefone {isLoggedIn && "(opcional)"}</Label>
                  <Input placeholder="(85) 99999-8888" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} required={!isLoggedIn} />
                </div>

                <div className="space-y-3 pt-2">
                  <Label className="text-base font-semibold">Forma de Pagamento</Label>
                  <RadioGroup value={billingType} onValueChange={setBillingType} className="grid grid-cols-3 gap-3">
                    {[
                      { value: "PIX", icon: QrCode, label: "Pix" },
                      { value: "CREDIT_CARD", icon: CreditCard, label: "Cartão" },
                      { value: "BOLETO", icon: FileText, label: "Boleto" },
                    ].map(({ value, icon: Icon, label }) => (
                      <div key={value}>
                        <RadioGroupItem value={value} id={value} className="peer sr-only" />
                        <Label htmlFor={value} className="flex flex-col items-center gap-2 rounded-lg border-2 border-muted bg-card p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary cursor-pointer">
                          <Icon className="h-6 w-6" />
                          <span className="text-sm font-medium">{label}</span>
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                </div>

                {billingType === "CREDIT_CARD" && (
                  <div className="space-y-3 border-t pt-4">
                    <Label className="text-sm font-semibold">Dados do Cartão</Label>
                    <Input placeholder="Número do cartão" value={formData.cardNumber} onChange={(e) => setFormData({ ...formData, cardNumber: e.target.value })} maxLength={19} />
                    <Input placeholder="Nome no cartão" value={formData.cardHolder} onChange={(e) => setFormData({ ...formData, cardHolder: e.target.value })} />
                    <div className="grid grid-cols-3 gap-3">
                      <Input placeholder="Mês (MM)" value={formData.cardExpMonth} onChange={(e) => setFormData({ ...formData, cardExpMonth: e.target.value })} maxLength={2} />
                      <Input placeholder="Ano (AAAA)" value={formData.cardExpYear} onChange={(e) => setFormData({ ...formData, cardExpYear: e.target.value })} maxLength={4} />
                      <Input placeholder="CVV" value={formData.cardCcv} onChange={(e) => setFormData({ ...formData, cardCcv: e.target.value })} maxLength={4} />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <Input placeholder="CEP" value={formData.postalCode} onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })} />
                      <Input placeholder="Nº endereço" value={formData.addressNumber} onChange={(e) => setFormData({ ...formData, addressNumber: e.target.value })} />
                    </div>
                  </div>
                )}

                <Button type="submit" size="lg" className="w-full" disabled={loading}>
                  {loading ? "Processando..." : `${isExpired ? "Renovar" : isLoggedIn ? "Assinar agora" : "Criar conta e Assinar"} - R$ ${PRICE},00/mês`}
                </Button>

                {!isLoggedIn && (
                  <p className="text-center text-sm text-muted-foreground">
                    Já tem conta?{" "}
                    <Button type="button" variant="link" className="p-0 h-auto text-sm" onClick={() => navigate("/auth")}>Faça login</Button>
                  </p>
                )}
              </form>
            </CardContent>
          </Card>
        )}

        {step === "payment" && paymentInfo && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                {paymentInfo.type === "PIX" ? "Pague com Pix" : "Pague o Boleto"}
              </CardTitle>
              <CardDescription>Após o pagamento, seu acesso será liberado automaticamente.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {paymentInfo.type === "PIX" && (
                <>
                  {paymentInfo.qrCode ? (
                    <div className="flex justify-center">
                      <img src={`data:image/png;base64,${paymentInfo.qrCode}`} alt="QR Code Pix" className="w-64 h-64 rounded-lg border" />
                    </div>
                  ) : (
                    <div className="text-center p-4 border rounded-lg bg-muted/50">
                      <QrCode className="h-16 w-16 mx-auto text-muted-foreground mb-2" />
                      <p className="text-sm text-muted-foreground">QR Code sendo gerado...</p>
                    </div>
                  )}
                  {paymentInfo.copyPaste && (
                    <div className="space-y-2">
                      <Label className="text-sm">Pix Copia e Cola</Label>
                      <div className="flex gap-2">
                        <Input value={paymentInfo.copyPaste} readOnly className="text-xs" />
                        <Button size="icon" variant="outline" onClick={() => copyToClipboard(paymentInfo.copyPaste)}>
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
              {paymentInfo.type === "BOLETO" && paymentInfo.bankSlipUrl && (
                <div className="text-center">
                  <Button asChild variant="outline" size="lg">
                    <a href={paymentInfo.bankSlipUrl} target="_blank" rel="noopener noreferrer">
                      <FileText className="h-5 w-5 mr-2" /> Abrir Boleto
                    </a>
                  </Button>
                </div>
              )}
              <p className="text-center text-lg font-bold text-primary">R$ {paymentInfo.value?.toFixed(2)}</p>
              <Button onClick={handleCheckPayment} className="w-full" disabled={checkingPayment}>
                {checkingPayment ? "Verificando..." : "Verificar Pagamento"}
              </Button>
            </CardContent>
          </Card>
        )}

        {step === "success" && (
          <Card>
            <CardContent className="pt-8 text-center space-y-4">
              <CheckCircle2 className="h-16 w-16 mx-auto text-green-500" />
              <h2 className="text-xl font-bold">Assinatura Ativada!</h2>
              <p className="text-muted-foreground">Seu acesso está liberado. Aproveite todos os recursos da Grape!</p>
              <Button size="lg" className="w-full" onClick={() => navigate("/dashboard")}>
                Ir para o Painel
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Subscription;
