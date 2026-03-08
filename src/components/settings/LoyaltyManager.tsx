import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, Gift, Users, Trophy } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface LoyaltyConfig {
  id?: string;
  is_enabled: boolean;
  spend_threshold: number;
  reward_type: string;
  reward_value: number;
  reward_description: string;
}

interface LoyaltyProgress {
  id: string;
  phone: string;
  total_spent: number;
  rewards_earned: number;
  rewards_redeemed: number;
  clients?: { name: string } | null;
}

export const LoyaltyManager = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState<LoyaltyConfig>({
    is_enabled: false,
    spend_threshold: 100,
    reward_type: "percentage",
    reward_value: 10,
    reward_description: "Desconto de fidelidade",
  });
  const [progress, setProgress] = useState<LoyaltyProgress[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [configRes, progressRes] = await Promise.all([
        supabase.from("loyalty_config").select("*").eq("restaurant_id", user.id).maybeSingle(),
        supabase.from("loyalty_progress").select("*, clients(name)").eq("restaurant_id", user.id).order("total_spent", { ascending: false }).limit(50),
      ]);

      if (configRes.data) {
        setConfig({
          id: configRes.data.id,
          is_enabled: configRes.data.is_enabled,
          spend_threshold: configRes.data.spend_threshold,
          reward_type: configRes.data.reward_type,
          reward_value: configRes.data.reward_value,
          reward_description: configRes.data.reward_description || "",
        });
      }

      setProgress(progressRes.data || []);
    } catch (error: any) {
      toast.error("Erro ao carregar configurações de fidelidade");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const payload = {
        restaurant_id: user.id,
        is_enabled: config.is_enabled,
        spend_threshold: config.spend_threshold,
        reward_type: config.reward_type,
        reward_value: config.reward_value,
        reward_description: config.reward_description,
        updated_at: new Date().toISOString(),
      };

      if (config.id) {
        const { error } = await supabase.from("loyalty_config").update(payload).eq("id", config.id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from("loyalty_config").insert(payload).select().single();
        if (error) throw error;
        setConfig(prev => ({ ...prev, id: data.id }));
      }

      toast.success("Configurações de fidelidade salvas!");
    } catch (error: any) {
      toast.error("Erro ao salvar: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-32">
          <Loader2 className="w-6 h-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Gift className="w-5 h-5" />
                Programa de Fidelidade
              </CardTitle>
              <CardDescription>
                Configure recompensas automáticas para clientes fiéis
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Label htmlFor="loyalty-toggle">
                {config.is_enabled ? "Ativo" : "Desativado"}
              </Label>
              <Switch
                id="loyalty-toggle"
                checked={config.is_enabled}
                onCheckedChange={(checked) => setConfig({ ...config, is_enabled: checked })}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {config.is_enabled && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Valor mínimo em compras (R$)</Label>
                  <Input
                    type="number"
                    min="1"
                    step="0.01"
                    value={config.spend_threshold}
                    onChange={(e) => setConfig({ ...config, spend_threshold: parseFloat(e.target.value) || 0 })}
                    placeholder="100.00"
                  />
                  <p className="text-xs text-muted-foreground">
                    Ao atingir esse valor acumulado, o cliente ganha a recompensa
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Tipo de recompensa</Label>
                  <Select
                    value={config.reward_type}
                    onValueChange={(v) => setConfig({ ...config, reward_type: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percentage">Desconto em %</SelectItem>
                      <SelectItem value="fixed">Desconto fixo (R$)</SelectItem>
                      <SelectItem value="free_delivery">Entrega grátis</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {config.reward_type !== "free_delivery" && (
                  <div className="space-y-2">
                    <Label>
                      Valor da recompensa {config.reward_type === "percentage" ? "(%)" : "(R$)"}
                    </Label>
                    <Input
                      type="number"
                      min="1"
                      value={config.reward_value}
                      onChange={(e) => setConfig({ ...config, reward_value: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Descrição da recompensa</Label>
                  <Textarea
                    value={config.reward_description}
                    onChange={(e) => setConfig({ ...config, reward_description: e.target.value })}
                    placeholder="Ex: Ganhe 10% de desconto no próximo pedido!"
                    rows={2}
                  />
                </div>
              </div>

              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm font-medium mb-1">Prévia da regra:</p>
                <p className="text-foreground">
                  A cada <strong>{formatCurrency(config.spend_threshold)}</strong> em compras, o cliente ganha{" "}
                  <strong>
                    {config.reward_type === "percentage"
                      ? `${config.reward_value}% de desconto`
                      : config.reward_type === "fixed"
                        ? `${formatCurrency(config.reward_value)} de desconto`
                        : "entrega grátis"}
                  </strong>
                  {config.reward_description && ` — "${config.reward_description}"`}
                </p>
              </div>
            </>
          )}

          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
            Salvar Configurações
          </Button>
        </CardContent>
      </Card>

      {config.is_enabled && progress.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Progresso dos Clientes
            </CardTitle>
            <CardDescription>
              Acompanhe o progresso de fidelidade dos seus clientes
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead>Total Gasto</TableHead>
                  <TableHead>Progresso</TableHead>
                  <TableHead>Recompensas</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {progress.map((p) => {
                  const progressPct = Math.min(
                    ((p.total_spent % config.spend_threshold) / config.spend_threshold) * 100,
                    100
                  );
                  const availableRewards = p.rewards_earned - p.rewards_redeemed;
                  return (
                    <TableRow key={p.id}>
                      <TableCell>{p.clients?.name || "—"}</TableCell>
                      <TableCell className="font-mono text-sm">{p.phone}</TableCell>
                      <TableCell>{formatCurrency(p.total_spent)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full bg-primary rounded-full transition-all"
                              style={{ width: `${progressPct}%` }}
                            />
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {progressPct.toFixed(0)}%
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {availableRewards > 0 ? (
                          <Badge className="bg-green-500/15 text-green-600 border-green-500/30">
                            <Trophy className="w-3 h-3 mr-1" />
                            {availableRewards} disponível
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            {p.rewards_redeemed} resgatadas
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
