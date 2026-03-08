import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Loader2, Plus, Trash2, MapPin } from "lucide-react";

interface DeliveryZone {
  id: string;
  neighborhood_name: string;
  delivery_fee: number;
  is_active: boolean;
}

export const DeliveryZonesManager = () => {
  const [zones, setZones] = useState<DeliveryZone[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newName, setNewName] = useState("");
  const [newFee, setNewFee] = useState("");
  const [deliveryMode, setDeliveryMode] = useState("delivery_and_pickup");
  const [savingMode, setSavingMode] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [zonesRes, profileRes] = await Promise.all([
        supabase.from("delivery_zones").select("*").eq("restaurant_id", user.id).order("neighborhood_name"),
        supabase.from("profiles").select("delivery_mode").eq("id", user.id).single(),
      ]);

      if (zonesRes.data) setZones(zonesRes.data);
      if (profileRes.data?.delivery_mode) setDeliveryMode(profileRes.data.delivery_mode);
    } catch (error) {
      toast.error("Erro ao carregar dados");
    } finally {
      setLoading(false);
    }
  };

  const addZone = async () => {
    if (!newName.trim()) return toast.error("Digite o nome do bairro");
    const fee = parseFloat(newFee) || 0;

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase.from("delivery_zones").insert({
        restaurant_id: user.id,
        neighborhood_name: newName.trim(),
        delivery_fee: fee,
      }).select().single();

      if (error) throw error;
      setZones(prev => [...prev, data].sort((a, b) => a.neighborhood_name.localeCompare(b.neighborhood_name)));
      setNewName("");
      setNewFee("");
      toast.success("Bairro adicionado!");
    } catch (error: any) {
      toast.error("Erro ao adicionar: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  const updateZone = async (id: string, updates: Partial<DeliveryZone>) => {
    try {
      const { error } = await supabase.from("delivery_zones").update(updates).eq("id", id);
      if (error) throw error;
      setZones(prev => prev.map(z => z.id === id ? { ...z, ...updates } : z));
    } catch (error: any) {
      toast.error("Erro ao atualizar");
    }
  };

  const deleteZone = async (id: string) => {
    try {
      const { error } = await supabase.from("delivery_zones").delete().eq("id", id);
      if (error) throw error;
      setZones(prev => prev.filter(z => z.id !== id));
      toast.success("Bairro removido");
    } catch (error: any) {
      toast.error("Erro ao remover");
    }
  };

  const saveDeliveryMode = async () => {
    setSavingMode(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { error } = await supabase.from("profiles").update({ delivery_mode: deliveryMode }).eq("id", user.id);
      if (error) throw error;
      toast.success("Modo de entrega salvo!");
    } catch (error: any) {
      toast.error("Erro ao salvar");
    } finally {
      setSavingMode(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" /></div>;
  }

  return (
    <div className="space-y-4">
      {/* Delivery Mode */}
      <Card>
        <CardHeader>
          <CardTitle>Modo de Atendimento</CardTitle>
          <CardDescription>Escolha como seus clientes podem receber os pedidos</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              onClick={() => setDeliveryMode("delivery_only")}
              className={`p-4 rounded-lg border-2 text-left transition-colors ${
                deliveryMode === "delivery_only"
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-muted-foreground/30"
              }`}
            >
              <p className="font-semibold">🛵 Só Delivery</p>
              <p className="text-sm text-muted-foreground">Apenas entrega no endereço do cliente</p>
            </button>
            <button
              onClick={() => setDeliveryMode("delivery_and_pickup")}
              className={`p-4 rounded-lg border-2 text-left transition-colors ${
                deliveryMode === "delivery_and_pickup"
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-muted-foreground/30"
              }`}
            >
              <p className="font-semibold">🛵 + 🏪 Delivery e Retirada</p>
              <p className="text-sm text-muted-foreground">O cliente pode escolher entre entrega ou retirar no local</p>
            </button>
          </div>
          <Button onClick={saveDeliveryMode} disabled={savingMode} size="sm">
            {savingMode && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
            Salvar Modo
          </Button>
        </CardContent>
      </Card>

      {/* Delivery Zones */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Bairros e Taxas de Entrega
          </CardTitle>
          <CardDescription>
            Cadastre os bairros que seu restaurante atende e defina a taxa de entrega de cada um
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Add new */}
          <div className="flex flex-col sm:flex-row gap-2 p-4 bg-muted rounded-lg">
            <Input
              placeholder="Nome do bairro"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="flex-1"
            />
            <Input
              placeholder="Taxa (R$)"
              type="number"
              min="0"
              step="0.50"
              value={newFee}
              onChange={(e) => setNewFee(e.target.value)}
              className="w-full sm:w-32"
            />
            <Button onClick={addZone} disabled={saving} className="gap-1">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              Adicionar
            </Button>
          </div>

          {/* List */}
          {zones.length === 0 ? (
            <p className="text-center text-muted-foreground py-6">
              Nenhum bairro cadastrado. Adicione os bairros que seu restaurante atende.
            </p>
          ) : (
            <div className="space-y-2">
              {zones.map((zone) => (
                <div
                  key={zone.id}
                  className={`flex items-center gap-3 p-3 rounded-lg border ${
                    !zone.is_active ? "opacity-50" : ""
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{zone.neighborhood_name}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Label className="text-xs text-muted-foreground whitespace-nowrap">R$</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.50"
                      value={zone.delivery_fee}
                      onChange={(e) => updateZone(zone.id, { delivery_fee: parseFloat(e.target.value) || 0 })}
                      className="w-24 h-8 text-sm"
                    />
                  </div>
                  <div className="flex items-center gap-1">
                    <Switch
                      checked={zone.is_active}
                      onCheckedChange={(checked) => updateZone(zone.id, { is_active: checked })}
                    />
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={() => deleteZone(zone.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
