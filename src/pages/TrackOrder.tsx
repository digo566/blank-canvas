import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, Clock, CheckCircle2, Truck, Search } from "lucide-react";
import { toast } from "sonner";

interface Order {
  id: string;
  tracking_code: string;
  status: string;
  total_amount: number;
  created_at: string;
  preparation_started_at: string | null;
  ready_at: string | null;
  delivered_at: string | null;
  order_items: Array<{
    quantity: number;
    products: {
      name: string;
    };
  }>;
}

const TrackOrder = () => {
  const [trackingCode, setTrackingCode] = useState("");
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(false);

  const handleTrack = async () => {
    if (!trackingCode.trim()) {
      toast.error("Digite o código de rastreamento");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("orders")
        .select(`
          id,
          tracking_code,
          status,
          total_amount,
          created_at,
          preparation_started_at,
          ready_at,
          delivered_at,
          order_items (
            quantity,
            products (
              name
            )
          )
        `)
        .eq("tracking_code", trackingCode.toUpperCase())
        .single();

      if (error || !data) {
        toast.error("Código não encontrado");
        setOrder(null);
        return;
      }

      setOrder(data);
    } catch (error) {
      console.error("Error tracking order:", error);
      toast.error("Erro ao buscar pedido");
    } finally {
      setLoading(false);
    }
  };

  const statusConfig = {
    pending: { label: "Pedido Recebido", icon: Package, color: "text-blue-500" },
    preparing: { label: "Em Preparação", icon: Clock, color: "text-yellow-500" },
    on_the_way: { label: "A Caminho", icon: Truck, color: "text-purple-500" },
    ready: { label: "Pronto", icon: CheckCircle2, color: "text-green-500" },
    delivered: { label: "Entregue", icon: CheckCircle2, color: "text-green-600" },
  };

  const getStatusStep = (status: string) => {
    const steps = ["pending", "preparing", "on_the_way", "ready", "delivered"];
    return steps.indexOf(status);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20 p-4 md:p-8">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-foreground">Acompanhar Meu Pedido</h1>
          <p className="text-muted-foreground">Digite seu código de rastreamento</p>
        </div>

        <Card>
          <CardContent className="pt-6 space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="Ex: A1B2C3D4"
                value={trackingCode}
                onChange={(e) => setTrackingCode(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === "Enter" && handleTrack()}
                className="uppercase"
              />
              <Button onClick={handleTrack} disabled={loading}>
                <Search className="h-4 w-4 mr-2" />
                Buscar
              </Button>
            </div>
          </CardContent>
        </Card>

        {order && (
          <Card>
            <CardHeader>
              <CardTitle>Pedido #{order.tracking_code}</CardTitle>
              <p className="text-sm text-muted-foreground">
                Realizado em {new Date(order.created_at).toLocaleDateString("pt-BR")} às{" "}
                {new Date(order.created_at).toLocaleTimeString("pt-BR")}
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Status Timeline */}
              <div className="space-y-4">
                {Object.entries(statusConfig).map(([key, config], index) => {
                  const Icon = config.icon;
                  const currentStep = getStatusStep(order.status);
                  const isActive = index <= currentStep;
                  const isCurrent = key === order.status;

                  return (
                    <div key={key} className="flex items-center gap-4">
                      <div
                        className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
                          isActive
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground"
                        } ${isCurrent ? "ring-2 ring-primary ring-offset-2" : ""}`}
                      >
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="flex-1">
                        <p
                          className={`font-medium ${
                            isActive ? "text-foreground" : "text-muted-foreground"
                          }`}
                        >
                          {config.label}
                        </p>
                        {isCurrent && (
                          <p className="text-sm text-primary font-semibold">Status Atual</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Order Items */}
              <div className="border-t pt-4">
                <h3 className="font-semibold mb-2">Itens do Pedido</h3>
                <div className="space-y-2">
                  {order.order_items.map((item, index) => (
                    <div key={index} className="flex justify-between text-sm">
                      <span>
                        {item.quantity}x {item.products.name}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-t pt-4 flex justify-between font-semibold">
                <span>Total</span>
                <span>R$ {Number(order.total_amount).toFixed(2)}</span>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default TrackOrder;
