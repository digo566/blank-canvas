import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, Plus, Trash2, Ticket, Copy, Calendar } from "lucide-react";

interface Coupon {
  id: string;
  code: string;
  description: string | null;
  discount_type: string;
  discount_value: number;
  min_order_amount: number;
  max_uses: number | null;
  current_uses: number;
  is_active: boolean;
  expires_at: string | null;
}

export const CouponsManager = () => {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const [newCode, setNewCode] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newDiscountType, setNewDiscountType] = useState("percentage");
  const [newDiscountValue, setNewDiscountValue] = useState("");
  const [newMinOrder, setNewMinOrder] = useState("");
  const [newMaxUses, setNewMaxUses] = useState("");
  const [newExpiresAt, setNewExpiresAt] = useState("");

  useEffect(() => {
    loadCoupons();
  }, []);

  const loadCoupons = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("coupons")
        .select("*")
        .eq("restaurant_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setCoupons(data || []);
    } catch (error) {
      toast.error("Erro ao carregar cupons");
    } finally {
      setLoading(false);
    }
  };

  const generateCode = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let code = "";
    for (let i = 0; i < 8; i++) code += chars[Math.floor(Math.random() * chars.length)];
    setNewCode(code);
  };

  const addCoupon = async () => {
    if (!newCode.trim()) return toast.error("Digite o código do cupom");
    if (!newDiscountValue || parseFloat(newDiscountValue) <= 0) return toast.error("Digite o valor do desconto");

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("coupons")
        .insert({
          restaurant_id: user.id,
          code: newCode.trim().toUpperCase(),
          description: newDescription.trim() || null,
          discount_type: newDiscountType,
          discount_value: parseFloat(newDiscountValue),
          min_order_amount: parseFloat(newMinOrder) || 0,
          max_uses: newMaxUses ? parseInt(newMaxUses) : null,
          expires_at: newExpiresAt || null,
        })
        .select()
        .single();

      if (error) {
        if (error.message.includes("unique") || error.message.includes("duplicate")) {
          toast.error("Já existe um cupom com esse código");
        } else {
          throw error;
        }
        return;
      }

      setCoupons(prev => [data, ...prev]);
      resetForm();
      toast.success("Cupom criado!");
    } catch (error: any) {
      toast.error("Erro ao criar cupom: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setNewCode("");
    setNewDescription("");
    setNewDiscountType("percentage");
    setNewDiscountValue("");
    setNewMinOrder("");
    setNewMaxUses("");
    setNewExpiresAt("");
    setShowForm(false);
  };

  const toggleCoupon = async (id: string, is_active: boolean) => {
    try {
      const { error } = await supabase.from("coupons").update({ is_active }).eq("id", id);
      if (error) throw error;
      setCoupons(prev => prev.map(c => c.id === id ? { ...c, is_active } : c));
    } catch {
      toast.error("Erro ao atualizar cupom");
    }
  };

  const deleteCoupon = async (id: string) => {
    try {
      const { error } = await supabase.from("coupons").delete().eq("id", id);
      if (error) throw error;
      setCoupons(prev => prev.filter(c => c.id !== id));
      toast.success("Cupom removido");
    } catch {
      toast.error("Erro ao remover");
    }
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success("Código copiado!");
  };

  if (loading) {
    return <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" /></div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Ticket className="h-5 w-5" />
          Cupons de Desconto
        </CardTitle>
        <CardDescription>
          Crie cupons de desconto para seus clientes. Eles podem usar no cardápio ou no atendente virtual.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!showForm ? (
          <Button onClick={() => { setShowForm(true); generateCode(); }} className="gap-1">
            <Plus className="w-4 h-4" /> Novo Cupom
          </Button>
        ) : (
          <div className="p-4 bg-muted rounded-lg space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label>Código do Cupom</Label>
                <div className="flex gap-1">
                  <Input
                    value={newCode}
                    onChange={(e) => setNewCode(e.target.value.toUpperCase())}
                    placeholder="EX: DESC10"
                    className="uppercase"
                  />
                  <Button variant="outline" size="icon" onClick={generateCode} title="Gerar código">
                    🎲
                  </Button>
                </div>
              </div>
              <div>
                <Label>Descrição (opcional)</Label>
                <Input
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Ex: 10% de desconto no primeiro pedido"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <Label>Tipo de Desconto</Label>
                <Select value={newDiscountType} onValueChange={setNewDiscountType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Porcentagem (%)</SelectItem>
                    <SelectItem value="fixed">Valor Fixo (R$)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Valor do Desconto</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={newDiscountValue}
                  onChange={(e) => setNewDiscountValue(e.target.value)}
                  placeholder={newDiscountType === "percentage" ? "10" : "5.00"}
                />
              </div>
              <div>
                <Label>Pedido Mínimo (R$)</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.50"
                  value={newMinOrder}
                  onChange={(e) => setNewMinOrder(e.target.value)}
                  placeholder="0"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label>Limite de Usos (vazio = ilimitado)</Label>
                <Input
                  type="number"
                  min="1"
                  value={newMaxUses}
                  onChange={(e) => setNewMaxUses(e.target.value)}
                  placeholder="Ilimitado"
                />
              </div>
              <div>
                <Label>Validade (vazio = sem validade)</Label>
                <Input
                  type="datetime-local"
                  value={newExpiresAt}
                  onChange={(e) => setNewExpiresAt(e.target.value)}
                />
              </div>
            </div>

            <div className="flex gap-2">
              <Button onClick={addCoupon} disabled={saving}>
                {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Plus className="w-4 h-4 mr-1" />}
                Criar Cupom
              </Button>
              <Button variant="outline" onClick={resetForm}>Cancelar</Button>
            </div>
          </div>
        )}

        {/* Coupons List */}
        {coupons.length === 0 ? (
          <p className="text-center text-muted-foreground py-6">
            Nenhum cupom criado. Crie cupons para oferecer descontos aos seus clientes!
          </p>
        ) : (
          <div className="space-y-2">
            {coupons.map((coupon) => (
              <div
                key={coupon.id}
                className={`flex items-center gap-3 p-3 rounded-lg border ${!coupon.is_active ? "opacity-50" : ""}`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <code className="text-sm font-bold bg-primary/10 text-primary px-2 py-0.5 rounded">
                      {coupon.code}
                    </code>
                    <Badge variant="outline" className="text-xs">
                      {coupon.discount_type === "percentage"
                        ? `${coupon.discount_value}%`
                        : `R$ ${Number(coupon.discount_value).toFixed(2)}`}
                    </Badge>
                    {coupon.max_uses && (
                      <span className="text-xs text-muted-foreground">
                        {coupon.current_uses}/{coupon.max_uses} usos
                      </span>
                    )}
                    {coupon.expires_at && (
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(coupon.expires_at) < new Date() ? "Expirado" : `até ${new Date(coupon.expires_at).toLocaleDateString("pt-BR")}`}
                      </span>
                    )}
                  </div>
                  {coupon.description && (
                    <p className="text-xs text-muted-foreground mt-1 truncate">{coupon.description}</p>
                  )}
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => copyCode(coupon.code)} title="Copiar código">
                  <Copy className="h-3.5 w-3.5" />
                </Button>
                <Switch checked={coupon.is_active} onCheckedChange={(checked) => toggleCoupon(coupon.id, checked)} />
                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => deleteCoupon(coupon.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
