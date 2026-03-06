import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useSearchParams } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CreditCard, QrCode, FileText, CheckCircle, Copy, LogOut, Eye, EyeOff } from "lucide-react";
import grapeLogo from "@/assets/grape-logo.png";
import { useNavigate } from "react-router-dom";

const Subscription = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [step, setStep] = useState<"form" | "payment" | "success">("form");
  const [loading, setLoading] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [billingType, setBillingType] = useState("PIX");
  const [paymentInfo, setPaymentInfo] = useState<any>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    // Account fields (only for new users)
    restaurantName: searchParams.get("restaurant") || "",
    password: "",
    // Subscription fields
    name: searchParams.get("name") || "",
    cpfCnpj: "",
    email: searchParams.get("email") || "",
    phone: searchParams.get("phone") || "",
    // Credit card fields
    cardNumber: "",
    cardHolder: "",
    cardExpMonth: "",
    cardExpYear: "",
    cardCcv: "",
    postalCode: "",
    addressNumber: "",
  });

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsLoggedIn(!!session?.user);
      if (session?.user?.email) {
        setFormData(prev => ({ ...prev, email: session.user.email || "" }));
      }
      setCheckingAuth(false);
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.cpfCnpj || !formData.email) {
      toast.error("Preencha nome, CPF/CNPJ e email");
      return;
    }

    // Validate account fields for new users
    if (!isLoggedIn) {
      if (!formData.restaurantName) {
        toast.error("Preencha o nome do restaurante");
        return;
      }
      if (!formData.password || formData.password.length < 6) {
        toast.error("A senha deve ter no mínimo 6 caracteres");
        return;
      }
      if (!formData.phone) {
        toast.error("Preencha o telefone");
        return;
      }
    }

    if (billingType === "CREDIT_CARD") {
      if (!formData.cardNumber || !formData.cardHolder || !formData.cardExpMonth || !formData.cardExpYear || !formData.cardCcv) {
        toast.error("Preencha todos os dados do cartão");
        return;
      }
    }

    setLoading(true);
    try {
      // Step 1: Create account if not logged in
      if (!isLoggedIn) {
        let normalizedPhone = formData.phone.replace(/\D/g, "");
        if (!normalizedPhone.startsWith("55")) {
          normalizedPhone = "55" + normalizedPhone;
        }

        const { data: signupData, error: signupError } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
          options: {
            emailRedirectTo: `${window.location.origin}/dashboard`,
            data: {
              restaurant_name: formData.restaurantName,
              phone: `+${normalizedPhone}`,
            },
          },
        });

        if (signupError) {
          toast.error(signupError.message);
          setLoading(false);
          return;
        }

        if (!signupData.user) {
          toast.error("Erro ao criar conta");
          setLoading(false);
          return;
        }

        setIsLoggedIn(true);
        toast.success("Conta criada! Processando pagamento...");
      }

      // Step 2: Create subscription via edge function
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

      const { data, error } = await supabase.functions.invoke("asaas-subscription", {
        body: payload,
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setPaymentInfo(data.paymentInfo);

      if (billingType === "CREDIT_CARD" && data.status === "active") {
        toast.success("Assinatura ativada com sucesso!");
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

  const handleCopyPix = () => {
    if (paymentInfo?.copyPaste) {
      navigator.clipboard.writeText(paymentInfo.copyPaste);
      toast.success("Código Pix copiado!");
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  if (checkingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-8">
          <img src={grapeLogo} alt="Grape" className="w-20 h-20 mx-auto mb-4 object-contain" />
          <h1 className="text-2xl font-bold text-foreground">
            {isLoggedIn ? "Ative sua Assinatura" : "Crie sua conta e Assine"}
          </h1>
          <p className="text-muted-foreground mt-2">
            {isLoggedIn
              ? "Para acessar o painel e ativar sua loja, assine o plano Grape."
              : "Preencha seus dados, crie sua conta e ative sua loja em um só passo."}
          </p>
          <p className="text-2xl font-bold text-primary mt-3">R$ 5,00/mês</p>
          <p className="text-xs text-muted-foreground">(valor promocional de teste)</p>
        </div>

        {step === "form" && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                {isLoggedIn ? "Dados para Assinatura" : "Cadastro + Assinatura"}
              </CardTitle>
              <CardDescription>
                {isLoggedIn
                  ? "Preencha seus dados para gerar o pagamento"
                  : "Crie sua conta e gere o pagamento de uma vez"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Account fields - only for new users */}
                {!isLoggedIn && (
                  <div className="space-y-3 border-b pb-4">
                    <Label className="text-base font-semibold">Dados da Conta</Label>
                    <div className="space-y-2">
                      <Label>Nome do Restaurante</Label>
                      <Input
                        placeholder="Meu Restaurante"
                        value={formData.restaurantName}
                        onChange={(e) => setFormData({ ...formData, restaurantName: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Senha</Label>
                      <div className="relative">
                        <Input
                          type={showPassword ? "text" : "password"}
                          placeholder="Mínimo 6 caracteres"
                          value={formData.password}
                          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                          required
                          minLength={6}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-0 top-0 h-full"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Subscription / billing fields */}
                <div className="space-y-2">
                  <Label>Nome Completo</Label>
                  <Input
                    placeholder="Seu nome"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label>CPF ou CNPJ</Label>
                  <Input
                    placeholder="000.000.000-00"
                    value={formData.cpfCnpj}
                    onChange={(e) => setFormData({ ...formData, cpfCnpj: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input
                    type="email"
                    placeholder="seu@email.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                    disabled={isLoggedIn}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Telefone {isLoggedIn && "(opcional)"}</Label>
                  <Input
                    placeholder="(85) 99999-8888"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    required={!isLoggedIn}
                  />
                </div>

                {/* Payment Method */}
                <div className="space-y-3 pt-2">
                  <Label className="text-base font-semibold">Forma de Pagamento</Label>
                  <RadioGroup value={billingType} onValueChange={setBillingType} className="grid grid-cols-3 gap-3">
                    <div>
                      <RadioGroupItem value="PIX" id="pix" className="peer sr-only" />
                      <Label
                        htmlFor="pix"
                        className="flex flex-col items-center gap-2 rounded-lg border-2 border-muted bg-card p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary cursor-pointer"
                      >
                        <QrCode className="h-6 w-6" />
                        <span className="text-sm font-medium">Pix</span>
                      </Label>
                    </div>
                    <div>
                      <RadioGroupItem value="CREDIT_CARD" id="credit_card" className="peer sr-only" />
                      <Label
                        htmlFor="credit_card"
                        className="flex flex-col items-center gap-2 rounded-lg border-2 border-muted bg-card p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary cursor-pointer"
                      >
                        <CreditCard className="h-6 w-6" />
                        <span className="text-sm font-medium">Cartão</span>
                      </Label>
                    </div>
                    <div>
                      <RadioGroupItem value="BOLETO" id="boleto" className="peer sr-only" />
                      <Label
                        htmlFor="boleto"
                        className="flex flex-col items-center gap-2 rounded-lg border-2 border-muted bg-card p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary cursor-pointer"
                      >
                        <FileText className="h-6 w-6" />
                        <span className="text-sm font-medium">Boleto</span>
                      </Label>
                    </div>
                  </RadioGroup>
                </div>

                {/* Credit Card Fields */}
                {billingType === "CREDIT_CARD" && (
                  <div className="space-y-3 border-t pt-4">
                    <Label className="text-sm font-semibold">Dados do Cartão</Label>
                    <Input
                      placeholder="Número do cartão"
                      value={formData.cardNumber}
                      onChange={(e) => setFormData({ ...formData, cardNumber: e.target.value })}
                      maxLength={19}
                    />
                    <Input
                      placeholder="Nome no cartão"
                      value={formData.cardHolder}
                      onChange={(e) => setFormData({ ...formData, cardHolder: e.target.value })}
                    />
                    <div className="grid grid-cols-3 gap-3">
                      <Input
                        placeholder="Mês (MM)"
                        value={formData.cardExpMonth}
                        onChange={(e) => setFormData({ ...formData, cardExpMonth: e.target.value })}
                        maxLength={2}
                      />
                      <Input
                        placeholder="Ano (AAAA)"
                        value={formData.cardExpYear}
                        onChange={(e) => setFormData({ ...formData, cardExpYear: e.target.value })}
                        maxLength={4}
                      />
                      <Input
                        placeholder="CVV"
                        value={formData.cardCcv}
                        onChange={(e) => setFormData({ ...formData, cardCcv: e.target.value })}
                        maxLength={4}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <Input
                        placeholder="CEP"
                        value={formData.postalCode}
                        onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
                      />
                      <Input
                        placeholder="Nº endereço"
                        value={formData.addressNumber}
                        onChange={(e) => setFormData({ ...formData, addressNumber: e.target.value })}
                      />
                    </div>
                  </div>
                )}

                <Button type="submit" size="lg" className="w-full" disabled={loading}>
                  {loading
                    ? "Processando..."
                    : isLoggedIn
                    ? "Assinar agora - R$ 5,00/mês"
                    : "Criar conta e Assinar - R$ 5,00/mês"}
                </Button>

                {!isLoggedIn && (
                  <p className="text-center text-sm text-muted-foreground">
                    Já tem conta?{" "}
                    <Button
                      type="button"
                      variant="link"
                      className="p-0 h-auto text-sm"
                      onClick={() => navigate("/auth")}
                    >
                      Faça login
                    </Button>
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
              <CardDescription>
                Após o pagamento, seu acesso será liberado automaticamente.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {paymentInfo.type === "PIX" && (
                <>
                  {paymentInfo.qrCode ? (
                    <div className="flex justify-center">
                      <img
                        src={`data:image/png;base64,${paymentInfo.qrCode}`}
                        alt="QR Code Pix"
                        className="w-64 h-64 rounded-lg border"
                      />
                    </div>
                  ) : (
                    <div className="text-center p-4 border rounded-lg bg-muted/50">
                      <QrCode className="h-16 w-16 mx-auto text-muted-foreground mb-2" />
                      <p className="text-sm text-muted-foreground">
                        QR Code sendo gerado... Aguarde alguns segundos e clique em "Verificar Pagamento".
                      </p>
                    </div>
                  )}
                  {paymentInfo.copyPaste ? (
                    <div className="space-y-2">
                      <Label>Pix Copia e Cola</Label>
                      <div className="flex gap-2">
                        <Input value={paymentInfo.copyPaste} readOnly className="text-xs" />
                        <Button variant="outline" size="icon" onClick={handleCopyPix}>
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-center text-muted-foreground">
                      Código Pix Copia e Cola ainda não disponível. Tente verificar novamente.
                    </p>
                  )}
                </>
              )}

              {paymentInfo.type === "BOLETO" && (
                <>
                  {paymentInfo.identificationField && (
                    <div className="space-y-2">
                      <Label>Linha Digitável</Label>
                      <div className="flex gap-2">
                        <Input value={paymentInfo.identificationField} readOnly className="text-xs" />
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => {
                            navigator.clipboard.writeText(paymentInfo.identificationField);
                            toast.success("Código copiado!");
                          }}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                  {paymentInfo.bankSlipUrl && (
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => window.open(paymentInfo.bankSlipUrl, "_blank")}
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      Abrir Boleto
                    </Button>
                  )}
                </>
              )}

              <div className="text-center pt-4">
                <p className="text-sm text-muted-foreground">
                  Já pagou? Clique abaixo para verificar:
                </p>
                <Button
                  variant="outline"
                  className="mt-2"
                  onClick={() => window.location.reload()}
                >
                  Verificar Pagamento
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {step === "success" && (
          <Card>
            <CardContent className="pt-8 text-center space-y-4">
              <div className="flex justify-center">
                <div className="rounded-full bg-primary/10 p-4">
                  <CheckCircle className="h-12 w-12 text-primary" />
                </div>
              </div>
              <h2 className="text-xl font-bold">Assinatura Ativada!</h2>
              <p className="text-muted-foreground">
                Seu acesso ao painel Grape está liberado. Aproveite!
              </p>
              <Button size="lg" className="w-full" onClick={() => navigate("/dashboard")}>
                Acessar Painel
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Logout / back button */}
        <div className="text-center mt-6">
          {isLoggedIn ? (
            <Button variant="ghost" size="sm" onClick={handleLogout} className="text-muted-foreground">
              <LogOut className="h-4 w-4 mr-2" />
              Sair da conta
            </Button>
          ) : (
            <Button variant="ghost" size="sm" onClick={() => navigate("/auth")} className="text-muted-foreground">
              Já tenho conta - Fazer login
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default Subscription;
