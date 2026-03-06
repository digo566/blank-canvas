import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { sanitizeError } from "@/lib/errorHandler";
import grapeLogo from "@/assets/grape-logo.png";
import { Lock, Eye, EyeOff, CheckCircle2, XCircle, ArrowLeft, ShieldCheck } from "lucide-react";

const ResetPassword = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isRecovery, setIsRecovery] = useState(false);
  const [checking, setChecking] = useState(true);
  const [success, setSuccess] = useState(false);
  const resolved = useRef(false);

  const hasMinLength = password.length >= 6;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const passwordsMatch = password === confirmPassword && confirmPassword.length > 0;

  useEffect(() => {
    const markRecovery = () => {
      if (!resolved.current) {
        resolved.current = true;
        setIsRecovery(true);
        setChecking(false);
      }
    };

    const markInvalid = () => {
      if (!resolved.current) {
        resolved.current = true;
        setIsRecovery(false);
        setChecking(false);
      }
    };

    // Check if URL has a code param (PKCE flow) or hash (implicit flow)
    const hasCode = searchParams.has("code");
    const hash = window.location.hash;
    const hasRecoveryHash = hash && new URLSearchParams(hash.substring(1)).get("type") === "recovery";

    if (hasRecoveryHash) {
      markRecovery();
    }

    // If there's a code, Supabase will exchange it — we need to wait for auth event
    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      console.log("[ResetPassword] Auth event:", event);
      if (event === "PASSWORD_RECOVERY") {
        markRecovery();
      } else if (event === "SIGNED_IN") {
        // SIGNED_IN after code exchange on /reset-password means recovery
        markRecovery();
      }
    });

    // If there's a code param, Supabase JS will handle it via exchangeCodeForSession
    // We just wait for the auth event. Give it enough time.
    if (hasCode) {
      // The code exchange can take a few seconds
      const timeout = setTimeout(() => {
        // After waiting, check if we got a session
        supabase.auth.getSession().then(({ data: { session } }) => {
          if (session) {
            markRecovery();
          } else {
            markInvalid();
          }
        });
      }, 5000);
      return () => {
        timeout && clearTimeout(timeout);
        subscription.unsubscribe();
      };
    }

    // No code, no hash — check existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        markRecovery();
      } else {
        // Wait a bit more for any auth redirect processing
        setTimeout(() => markInvalid(), 3000);
      }
    });

    return () => subscription.unsubscribe();
  }, [searchParams]);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordsMatch) {
      toast.error("As senhas não coincidem.");
      return;
    }
    if (!hasMinLength) {
      toast.error("A senha deve ter pelo menos 6 caracteres.");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        toast.error(sanitizeError(error));
        return;
      }
      setSuccess(true);
      toast.success("Senha atualizada com sucesso!");
      setTimeout(() => navigate("/dashboard"), 2500);
    } catch (error: unknown) {
      toast.error(sanitizeError(error));
    } finally {
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-primary/5 via-background to-primary/10">
        <Card className="w-full max-w-md border-none shadow-2xl">
          <CardContent className="flex flex-col items-center justify-center py-16 gap-4">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            <p className="text-muted-foreground text-sm">Verificando link de recuperação...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-primary/5 via-background to-primary/10">
        <Card className="w-full max-w-md border-none shadow-2xl">
          <CardContent className="flex flex-col items-center justify-center py-16 gap-4">
            <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>
            <h2 className="text-xl font-bold text-foreground">Senha Atualizada!</h2>
            <p className="text-muted-foreground text-sm text-center">
              Sua senha foi alterada com sucesso. Redirecionando...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!isRecovery) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-primary/5 via-background to-primary/10">
        <Card className="w-full max-w-md border-none shadow-2xl">
          <CardHeader className="text-center pb-2">
            <img src={grapeLogo} alt="grape" className="mx-auto w-16 h-16 object-contain mb-4" />
            <CardTitle className="text-xl font-bold text-foreground">Link Inválido</CardTitle>
            <CardDescription>
              Este link de recuperação é inválido ou já expirou. Solicite um novo link na página de login.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" onClick={() => navigate("/auth")}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar ao Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-primary/5 via-background to-primary/10">
      <Card className="w-full max-w-md border-none shadow-2xl">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
            <ShieldCheck className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold text-foreground">Criar Nova Senha</CardTitle>
          <CardDescription>Escolha uma senha segura para sua conta.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleResetPassword} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="new-password">Nova Senha</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="new-password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Mínimo 6 caracteres"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirmar Senha</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="confirm-password"
                  type={showConfirm ? "text" : "password"}
                  placeholder="Repita a senha"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="pl-10 pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {password.length > 0 && (
              <div className="rounded-lg bg-muted/50 p-3 space-y-1.5">
                <p className="text-xs font-medium text-muted-foreground mb-1">Requisitos da senha:</p>
                <RequirementItem met={hasMinLength} text="Mínimo 6 caracteres" />
                <RequirementItem met={hasUpperCase} text="Uma letra maiúscula" />
                <RequirementItem met={hasNumber} text="Um número" />
                {confirmPassword.length > 0 && (
                  <RequirementItem met={passwordsMatch} text="Senhas coincidem" />
                )}
              </div>
            )}

            <Button
              type="submit"
              className="w-full"
              disabled={loading || !hasMinLength || !passwordsMatch}
            >
              {loading ? "Atualizando..." : "Salvar Nova Senha"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

const RequirementItem = ({ met, text }: { met: boolean; text: string }) => (
  <div className="flex items-center gap-2 text-xs">
    {met ? (
      <CheckCircle2 className="h-3.5 w-3.5 text-green-600 shrink-0" />
    ) : (
      <XCircle className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
    )}
    <span className={met ? "text-green-700" : "text-muted-foreground"}>{text}</span>
  </div>
);

export default ResetPassword;