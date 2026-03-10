import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChefHat, Clock, CheckCircle2, ArrowRight, Maximize, Minimize, Volume2, VolumeX } from "lucide-react";

interface KitchenOrder {
  id: string;
  tracking_code: string;
  status: string;
  created_at: string;
  preparation_started_at: string | null;
  notes: string | null;
  order_type: string;
  table_number: string | null;
  order_items: {
    quantity: number;
    products: { name: string } | null;
    id: string;
  }[];
}

const Kitchen = () => {
  const { user } = useAuth();
  const [orders, setOrders] = useState<KitchenOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [now, setNow] = useState(Date.now());

  // Timer update every second
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (user) {
      loadOrders();
      subscribeToOrders();
    }
  }, [user]);

  const loadOrders = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from("orders")
      .select("id, tracking_code, status, created_at, preparation_started_at, notes, order_type, table_number, order_items(id, quantity, products(name))")
      .eq("restaurant_id", user.id)
      .in("status", ["pending", "preparing", "ready"])
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error loading orders:", error);
    } else {
      setOrders((data as unknown as KitchenOrder[]) || []);
    }
    setLoading(false);
  };

  const subscribeToOrders = () => {
    if (!user) return;
    const channel = supabase
      .channel("kitchen-orders")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders", filter: `restaurant_id=eq.${user.id}` }, () => {
        loadOrders();
        if (soundEnabled) playSound();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  };

  const playSound = () => {
    try {
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 880;
      osc.type = "sine";
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.3);
    } catch {}
  };

  const updateStatus = async (orderId: string, newStatus: string) => {
    const { error } = await supabase
      .from("orders")
      .update({ status: newStatus as any })
      .eq("id", orderId);
    if (error) {
      toast.error("Erro ao atualizar status");
    } else {
      toast.success(`Pedido atualizado para ${statusLabels[newStatus]}`);
      loadOrders();
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const getElapsedTime = (dateStr: string) => {
    const elapsed = Math.floor((now - new Date(dateStr).getTime()) / 1000);
    const mins = Math.floor(elapsed / 60);
    const secs = elapsed % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const getTimerColor = (dateStr: string) => {
    const elapsed = Math.floor((now - new Date(dateStr).getTime()) / 1000 / 60);
    if (elapsed < 10) return "text-green-500";
    if (elapsed < 20) return "text-yellow-500";
    return "text-red-500";
  };

  const statusLabels: Record<string, string> = {
    pending: "Pendente",
    preparing: "Preparando",
    ready: "Pronto",
    on_the_way: "Saiu para Entrega",
    delivered: "Entregue",
  };

  const orderTypeLabels: Record<string, string> = {
    delivery: "🛵 Delivery",
    pickup: "🏪 Retirada",
    dine_in: "🍽️ Mesa",
    counter: "🏪 Balcão",
  };

  const pendingOrders = orders.filter(o => o.status === "pending");
  const preparingOrders = orders.filter(o => o.status === "preparing");
  const readyOrders = orders.filter(o => o.status === "ready");

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  const OrderCard = ({ order, actions }: { order: KitchenOrder; actions: React.ReactNode }) => (
    <Card className="p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-bold text-lg">#{order.tracking_code}</span>
          {order.table_number && (
            <Badge variant="outline" className="text-xs">Mesa {order.table_number}</Badge>
          )}
        </div>
        <div className={`font-mono text-lg font-bold ${getTimerColor(order.preparation_started_at || order.created_at)}`}>
          <Clock className="inline h-4 w-4 mr-1" />
          {getElapsedTime(order.preparation_started_at || order.created_at)}
        </div>
      </div>

      <Badge variant="secondary" className="text-xs">
        {orderTypeLabels[order.order_type] || orderTypeLabels.delivery}
      </Badge>

      <div className="space-y-1 border-t pt-2">
        {order.order_items.map((item) => (
          <div key={item.id} className="flex items-center gap-2 text-sm">
            <span className="font-bold text-primary">{item.quantity}x</span>
            <span>{item.products?.name || "Produto"}</span>
          </div>
        ))}
      </div>

      {order.notes && (
        <div className="text-xs bg-muted p-2 rounded-md">
          📝 {order.notes}
        </div>
      )}

      <div className="flex gap-2 pt-1">{actions}</div>
    </Card>
  );

  return (
    <div className="min-h-screen bg-background p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <ChefHat className="h-8 w-8 text-primary" />
          <h1 className="text-2xl font-bold">Display da Cozinha (KDS)</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => setSoundEnabled(!soundEnabled)}>
            {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
          </Button>
          <Button variant="outline" size="icon" onClick={toggleFullscreen}>
            {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* Columns */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Pending */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-3 h-3 rounded-full bg-yellow-500" />
            <h2 className="text-lg font-bold">Pendentes ({pendingOrders.length})</h2>
          </div>
          <div className="space-y-4">
            {pendingOrders.map(order => (
              <OrderCard key={order.id} order={order} actions={
                <Button className="w-full" onClick={() => updateStatus(order.id, "preparing")}>
                  <ArrowRight className="h-4 w-4 mr-2" /> Iniciar Preparo
                </Button>
              } />
            ))}
            {pendingOrders.length === 0 && (
              <p className="text-center text-muted-foreground py-8">Nenhum pedido pendente</p>
            )}
          </div>
        </div>

        {/* Preparing */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-3 h-3 rounded-full bg-blue-500" />
            <h2 className="text-lg font-bold">Preparando ({preparingOrders.length})</h2>
          </div>
          <div className="space-y-4">
            {preparingOrders.map(order => (
              <OrderCard key={order.id} order={order} actions={
                <Button className="w-full bg-green-600 hover:bg-green-700" onClick={() => updateStatus(order.id, "ready")}>
                  <CheckCircle2 className="h-4 w-4 mr-2" /> Marcar Pronto
                </Button>
              } />
            ))}
            {preparingOrders.length === 0 && (
              <p className="text-center text-muted-foreground py-8">Nenhum pedido em preparo</p>
            )}
          </div>
        </div>

        {/* Ready */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-3 h-3 rounded-full bg-green-500" />
            <h2 className="text-lg font-bold">Prontos ({readyOrders.length})</h2>
          </div>
          <div className="space-y-4">
            {readyOrders.map(order => (
              <OrderCard key={order.id} order={order} actions={
                <Button className="w-full" variant="outline" onClick={() => updateStatus(order.id, order.order_type === "delivery" ? "on_the_way" : "delivered")}>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  {order.order_type === "delivery" ? "Saiu para Entrega" : "Entregar"}
                </Button>
              } />
            ))}
            {readyOrders.length === 0 && (
              <p className="text-center text-muted-foreground py-8">Nenhum pedido pronto</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Kitchen;
