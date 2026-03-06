import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { z } from "zod";
import { formatPhoneToWhatsApp, validateBrazilianPhone } from "@/lib/utils";
import { sanitizeError } from "@/lib/errorHandler";

const clientAuthSchema = z.object({
  name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  phone: z.string().refine(validateBrazilianPhone, {
    message: "WhatsApp inválido. Use DDD + número (ex: 85999998888)"
  }),
  password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres"),
});

interface ClientAuthProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  restaurantId: string;
}

export function ClientAuth({ isOpen, onClose, onSuccess, restaurantId }: ClientAuthProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    password: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        // Formatar número para o padrão WhatsApp
        const formattedPhone = formatPhoneToWhatsApp(formData.phone);
        
        // Login - buscar cliente pelo WhatsApp
        const { data: clientData, error: clientError } = await supabase
          .from("clients")
          .select("user_id, email")
          .eq("phone", formattedPhone)
          .eq("restaurant_id", restaurantId)
          .maybeSingle();

        if (clientError) throw clientError;

        if (!clientData) {
          toast.error("WhatsApp não encontrado. Faça seu cadastro primeiro.");
          setLoading(false);
          return;
        }

        // Login usando o email vinculado
        const { error: authError } = await supabase.auth.signInWithPassword({
          email: clientData.email,
          password: formData.password,
        });

        if (authError) {
          toast.error(sanitizeError(authError));
          setLoading(false);
          return;
        }

        toast.success("Login realizado com sucesso!");
        onSuccess();
      } else {
        // Cadastro
        const validation = clientAuthSchema.safeParse(formData);
        if (!validation.success) {
          toast.error(validation.error.errors[0].message);
          setLoading(false);
          return;
        }

        // Formatar número para o padrão WhatsApp
        const formattedPhone = formatPhoneToWhatsApp(formData.phone);
        
        // Verificar se WhatsApp já está cadastrado
        const { data: existingClient } = await supabase
          .from("clients")
          .select("id")
          .eq("phone", formattedPhone)
          .eq("restaurant_id", restaurantId)
          .maybeSingle();

        if (existingClient) {
          toast.error("Este WhatsApp já está cadastrado. Faça login.");
          setLoading(false);
          return;
        }

        // Criar email único baseado no telefone (formato: phone@restaurant-id.app)
        const uniqueEmail = `${formattedPhone.replace(/\D/g, "")}@${restaurantId.substring(0, 8)}.app`;

        // Criar usuário no auth
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: uniqueEmail,
          password: formData.password,
          options: {
            emailRedirectTo: `${window.location.origin}/r/${restaurantId}`,
            data: {
              phone: formattedPhone,
              name: formData.name,
            },
          },
        });

        if (authError) {
          toast.error(sanitizeError(authError));
          setLoading(false);
          return;
        }

        if (authData.user) {
          // Criar cliente
          const { error: clientError } = await supabase.from("clients").insert({
            name: formData.name,
            email: uniqueEmail,
            phone: formattedPhone,
            restaurant_id: restaurantId,
            user_id: authData.user.id,
          });

          if (clientError) throw clientError;

          toast.success("Cadastro realizado! Você já está logado.");
          onSuccess();
        }
      }
    } catch (error: unknown) {
      toast.error(sanitizeError(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isLogin ? "Fazer Login" : "Criar Conta"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div>
              <Label htmlFor="name">Nome Completo</Label>
              <Input
                id="name"
                placeholder="Digite seu nome"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>
          )}

          <div>
            <Label htmlFor="phone">WhatsApp (DDD + número)</Label>
            <Input
              id="phone"
              type="tel"
              placeholder="85999998888"
              value={formData.phone}
              onChange={(e) => {
                // Remove tudo que não for número
                const numbers = e.target.value.replace(/\D/g, "");
                setFormData({ ...formData, phone: numbers });
              }}
              maxLength={11}
              required
            />
            <p className="text-xs text-muted-foreground mt-1">
              Exemplo: 85999998888 (será salvo como +5585999998888)
            </p>
          </div>

          <div>
            <Label htmlFor="password">Senha</Label>
            <Input
              id="password"
              type="password"
              placeholder="Mínimo 6 caracteres"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              required
            />
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Processando..." : isLogin ? "Entrar" : "Criar Conta"}
          </Button>

          <Button
            type="button"
            variant="ghost"
            className="w-full"
            onClick={() => setIsLogin(!isLogin)}
          >
            {isLogin ? "Não tem conta? Cadastre-se" : "Já tem conta? Faça login"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
