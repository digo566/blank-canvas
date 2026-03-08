import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trophy, Gift, MessageCircle } from "lucide-react";

interface LoyaltyBadgeProps {
  phone: string | undefined;
  clientName: string | undefined;
  restaurantId: string;
}

interface LoyaltyInfo {
  total_spent: number;
  rewards_earned: number;
  rewards_redeemed: number;
}

interface LoyaltyConfig {
  spend_threshold: number;
  reward_type: string;
  reward_value: number;
  reward_description: string | null;
}

export const LoyaltyBadge = ({ phone, clientName, restaurantId }: LoyaltyBadgeProps) => {
  const [loyalty, setLoyalty] = useState<LoyaltyInfo | null>(null);
  const [config, setConfig] = useState<LoyaltyConfig | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!phone) { setLoading(false); return; }
    loadLoyalty();
  }, [phone, restaurantId]);

  const loadLoyalty = async () => {
    try {
      const [configRes, progressRes] = await Promise.all([
        supabase.from("loyalty_config").select("spend_threshold, reward_type, reward_value, reward_description").eq("restaurant_id", restaurantId).eq("is_enabled", true).maybeSingle(),
        supabase.from("loyalty_progress").select("total_spent, rewards_earned, rewards_redeemed").eq("restaurant_id", restaurantId).eq("phone", phone).maybeSingle(),
      ]);
      setConfig(configRes.data);
      setLoyalty(progressRes.data);
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  };

  if (loading || !config || !phone) return null;

  const totalSpent = loyalty?.total_spent || 0;
  const rewardsEarned = loyalty?.rewards_earned || 0;
  const rewardsRedeemed = loyalty?.rewards_redeemed || 0;
  const availableRewards = rewardsEarned - rewardsRedeemed;
  const progressPct = Math.min(((totalSpent % config.spend_threshold) / config.spend_threshold) * 100, 100);
  const remaining = config.spend_threshold - (totalSpent % config.spend_threshold);

  const rewardLabel = config.reward_type === "percentage"
    ? `${config.reward_value}% de desconto`
    : config.reward_type === "fixed"
      ? `R$ ${Number(config.reward_value).toFixed(2)} de desconto`
      : "entrega grátis";

  const formatCurrency = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

  const sendWhatsAppNotification = () => {
    const cleanPhone = phone.replace(/\D/g, "");
    const message = availableRewards > 0
      ? `Olá ${clientName || ""}! 🎉 Parabéns! Você completou nosso programa de fidelidade e ganhou *${rewardLabel}*! ${config.reward_description || ""} Aproveite no seu próximo pedido!`
      : `Olá ${clientName || ""}! 🌟 Você já gastou ${formatCurrency(totalSpent)} conosco! Faltam apenas ${formatCurrency(remaining)} para ganhar *${rewardLabel}*! Continue pedindo!`;
    window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`, "_blank");
  };

  return (
    <div className="space-y-2 p-3 rounded-lg border bg-muted/30">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
          <Gift className="h-3.5 w-3.5" /> Fidelidade
        </p>
        {availableRewards > 0 && (
          <Badge className="bg-green-500/15 text-green-600 border-green-500/30 text-xs animate-pulse">
            <Trophy className="h-3 w-3 mr-1" />
            {availableRewards} recompensa{availableRewards > 1 ? "s" : ""} disponível!
          </Badge>
        )}
      </div>

      <div className="flex items-center gap-2">
        <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
          <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${progressPct}%` }} />
        </div>
        <span className="text-xs text-muted-foreground whitespace-nowrap">{progressPct.toFixed(0)}%</span>
      </div>

      <p className="text-xs text-muted-foreground">
        Total: {formatCurrency(totalSpent)} • {availableRewards > 0
          ? `🎉 Ganhou ${rewardLabel}!`
          : `Faltam ${formatCurrency(remaining)} para ${rewardLabel}`}
      </p>

      <Button variant="outline" size="sm" className="w-full gap-2 h-7 text-xs" onClick={sendWhatsAppNotification}>
        <MessageCircle className="h-3.5 w-3.5" />
        {availableRewards > 0 ? "Avisar cliente da recompensa" : "Enviar progresso por WhatsApp"}
      </Button>
    </div>
  );
};
