import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { MapPin, Loader2 } from "lucide-react";

interface AddressCount {
  address: string;
  count: number;
}

export function DeliveryHeatmap() {
  const [addresses, setAddresses] = useState<AddressCount[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDeliveryAddresses();
  }, []);

  const loadDeliveryAddresses = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

      const { data: orders } = await supabase
        .from("orders")
        .select("client_id, clients(address)")
        .eq("restaurant_id", user.id)
        .gte("created_at", thirtyDaysAgo)
        .neq("status", "cancelled");

      if (!orders) return;

      // Count addresses
      const addressMap: Record<string, number> = {};
      orders.forEach((order: any) => {
        const addr = order.clients?.address;
        if (addr && addr.trim().length > 0) {
          const normalizedAddr = addr.trim().toLowerCase();
          addressMap[normalizedAddr] = (addressMap[normalizedAddr] || 0) + 1;
        }
      });

      const sorted = Object.entries(addressMap)
        .map(([address, count]) => ({ address, count }))
        .sort((a, b) => b.count - a.count);

      setAddresses(sorted);
    } catch (error) {
      console.error("Erro ao carregar endereços:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center h-48">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      </Card>
    );
  }

  const maxCount = addresses.length > 0 ? addresses[0].count : 1;

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-1 flex items-center gap-2">
        <MapPin className="h-5 w-5 text-primary" />
        Mapa de Calor de Entregas (30 dias)
      </h3>
      <p className="text-sm text-muted-foreground mb-4">
        Locais com mais pedidos na sua região
      </p>

      {addresses.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <MapPin className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Nenhum endereço de entrega registrado nos últimos 30 dias</p>
        </div>
      ) : (
        <div className="space-y-2 max-h-[400px] overflow-y-auto">
          {addresses.slice(0, 20).map((item, i) => {
            const intensity = item.count / maxCount;
            return (
              <div
                key={i}
                className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
              >
                <div
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{
                    backgroundColor: `hsl(${120 * intensity}, 70%, ${60 - intensity * 20}%)`,
                  }}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate capitalize">{item.address}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <div
                    className="h-2 rounded-full bg-primary/60"
                    style={{ width: `${Math.max(20, intensity * 100)}px` }}
                  />
                  <span className="text-sm font-semibold text-primary min-w-[40px] text-right">
                    {item.count} {item.count === 1 ? "pedido" : "pedidos"}
                  </span>
                </div>
              </div>
            );
          })}
          {addresses.length > 20 && (
            <p className="text-xs text-muted-foreground text-center pt-2">
              +{addresses.length - 20} endereços adicionais
            </p>
          )}
        </div>
      )}

      {addresses.length > 0 && (
        <div className="mt-4 p-3 bg-primary/5 rounded-lg border border-primary/20">
          <p className="text-sm font-medium">📍 Região mais popular:</p>
          <p className="text-sm text-muted-foreground capitalize">
            {addresses[0].address} — {addresses[0].count} pedidos
          </p>
        </div>
      )}
    </Card>
  );
}
