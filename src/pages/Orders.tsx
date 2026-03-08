import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Search, ShoppingBag, MessageCircle } from "lucide-react";
import { PreNotaFiscal } from "@/components/orders/PreNotaFiscal";

interface Order {
  id: string;
  tracking_code: string;
  total_amount: number;
  delivery_fee: number | null;
  coupon_discount: number | null;
  status: string;
  created_at: string;
  payment_method: string | null;
  needs_change: boolean | null;
  change_amount: number | null;
  notes: string | null;
  clients: {
    name: string;
    phone: string;
    address: string | null;
  } | null;
  order_items: {
    quantity: number;
    unit_price: number;
    products: {
      name: string;
    } | null;
  }[];
}

const statusColors: Record<string, string> = {
  pending: "bg-yellow-500/15 text-yellow-600 border-yellow-500/30",
  preparing: "bg-blue-500/15 text-blue-600 border-blue-500/30",
  on_the_way: "bg-purple-500/15 text-purple-600 border-purple-500/30",
  ready: "bg-green-500/15 text-green-600 border-green-500/30",
  delivered: "bg-muted text-muted-foreground border-border",
  cancelled: "bg-red-500/15 text-red-600 border-red-500/30",
};

const statusDot: Record<string, string> = {
  pending: "bg-yellow-500",
  preparing: "bg-blue-500",
  on_the_way: "bg-purple-500",
  ready: "bg-green-500",
  delivered: "bg-muted-foreground",
  cancelled: "bg-red-500",
};

const statusLabels: Record<string, string> = {
  pending: "Pendente",
  preparing: "Em Preparo",
  on_the_way: "A Caminho",
  ready: "Pronto",
  delivered: "Entregue",
  cancelled: "Cancelado",
};

const Orders = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [editingDeliveryFee, setEditingDeliveryFee] = useState<string | null>(null);
  const [deliveryFeeValue, setDeliveryFeeValue] = useState("");

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("orders")
        .select(`
          *,
          clients(name, phone, address),
          order_items(quantity, unit_price, products(name))
        `)
        .eq("restaurant_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setOrders(data || []);
    } catch (error: any) {
      toast.error("Erro ao carregar pedidos");
    } finally {
      setLoading(false);
    }
  };

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from("orders")
        .update({ status: newStatus as any })
        .eq("id", orderId);

      if (error) throw error;
      toast.success("Status atualizado!");
      loadOrders();
      if (selectedOrder?.id === orderId) {
        setSelectedOrder((prev) => prev ? { ...prev, status: newStatus } : null);
      }
    } catch (error: any) {
      toast.error("Erro ao atualizar status");
    }
  };

  const updateDeliveryFee = async (orderId: string, fee: number) => {
    try {
      const order = orders.find(o => o.id === orderId);
      if (!order) return;
      
      const oldFee = Number(order.delivery_fee || 0);
      const newTotal = Number(order.total_amount) - oldFee + fee;
      
      const { error } = await supabase
        .from("orders")
        .update({ delivery_fee: fee, total_amount: newTotal })
        .eq("id", orderId);

      if (error) throw error;
      toast.success("Taxa de entrega atualizada!");
      loadOrders();
      if (selectedOrder?.id === orderId) {
        setSelectedOrder(prev => prev ? { ...prev, delivery_fee: fee, total_amount: newTotal } : null);
      }
      setEditingDeliveryFee(null);
    } catch {
      toast.error("Erro ao atualizar taxa");
    }
  };

  const filteredOrders = orders.filter((order) => {
    const matchesSearch =
      !searchTerm ||
      order.clients?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.tracking_code?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === "all" || order.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Pedidos</h1>
          <p className="text-sm text-muted-foreground">Gerencie os pedidos do seu restaurante</p>
        </div>

        {/* Search & Filters */}
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por cliente ou código..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 h-9 text-sm"
            />
          </div>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-full sm:w-[160px] h-9 text-sm">
              <SelectValue placeholder="Filtrar status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="pending">Pendente</SelectItem>
              <SelectItem value="preparing">Em Preparo</SelectItem>
              <SelectItem value="on_the_way">A Caminho</SelectItem>
              <SelectItem value="ready">Pronto</SelectItem>
              <SelectItem value="delivered">Entregue</SelectItem>
              <SelectItem value="cancelled">Cancelado</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Status Legend */}
        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          <span className="font-medium">Status:</span>
          {Object.entries(statusLabels).map(([key, label]) => (
            <span key={key} className="flex items-center gap-1">
              <span className={`w-2 h-2 rounded-full ${statusDot[key]}`} />
              {label}
            </span>
          ))}
        </div>

        {/* Orders Grid */}
        {filteredOrders.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <ShoppingBag className="h-10 w-10 text-muted-foreground mb-2" />
              <p className="text-muted-foreground">Nenhum pedido encontrado</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {filteredOrders.map((order) => (
              <button
                key={order.id}
                onClick={() => setSelectedOrder(order)}
                className="text-left group"
              >
                <Card className="h-full transition-all hover:shadow-md hover:border-primary/40 cursor-pointer">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-sm font-semibold truncate flex-1">
                        {order.clients?.name || "Sem nome"}
                      </h3>
                    </div>

                    <Badge
                      variant="outline"
                      className={`${statusColors[order.status]} text-xs px-2 py-0.5 w-full justify-center`}
                    >
                      <span className={`w-2 h-2 rounded-full mr-1.5 ${statusDot[order.status]}`} />
                      {statusLabels[order.status]}
                    </Badge>

                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">
                        🛒 {order.order_items.length} {order.order_items.length === 1 ? "item" : "itens"}
                      </span>
                      <span className="text-sm font-bold text-primary">
                        R$ {Number(order.total_amount).toFixed(2)}
                      </span>
                    </div>

                    <p className="text-xs text-muted-foreground text-center">
                      {format(new Date(order.created_at), "dd/MM HH:mm")}
                    </p>
                  </CardContent>
                </Card>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Order Detail Dialog */}
      <Dialog open={!!selectedOrder} onOpenChange={(open) => !open && setSelectedOrder(null)}>
        <DialogContent className="max-w-md">
          {selectedOrder && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center justify-between pr-6">
                  <span>{selectedOrder.clients?.name || "Cliente não identificado"}</span>
                  <Badge className={statusColors[selectedOrder.status]}>
                    {statusLabels[selectedOrder.status]}
                  </Badge>
                </DialogTitle>
                <p className="text-xs text-muted-foreground">
                  {format(new Date(selectedOrder.created_at), "PPpp", { locale: ptBR })}
                </p>
                <code className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full border border-primary/30 w-fit">
                  {selectedOrder.tracking_code}
                </code>
              </DialogHeader>

              <div className="space-y-4 mt-2">
                {selectedOrder.clients?.address && (
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground">📍 Endereço</p>
                    <p className="text-sm">{selectedOrder.clients.address}</p>
                  </div>
                )}

                <div className="space-y-1.5">
                  <p className="text-xs font-medium text-muted-foreground">🛒 Itens do Pedido</p>
                  <div className="bg-muted/50 rounded-lg p-2 space-y-1">
                    {selectedOrder.order_items.map((item, index) => (
                      <div key={index} className="flex justify-between text-sm">
                        <span>{item.quantity}x {item.products?.name || "—"}</span>
                        <span className="text-muted-foreground">
                          R$ {(item.quantity * Number(item.unit_price)).toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {selectedOrder.payment_method && (
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground">💳 Pagamento</p>
                    <p className="text-sm capitalize">
                      {selectedOrder.payment_method}
                      {selectedOrder.payment_method === "dinheiro" && selectedOrder.needs_change && selectedOrder.change_amount && (
                        <span className="text-muted-foreground">
                          {" "}• Troco para R$ {Number(selectedOrder.change_amount).toFixed(2)}
                        </span>
                      )}
                    </p>
                  </div>
                )}

                {selectedOrder.notes && (
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground">📝 Observações</p>
                    <p className="text-sm bg-muted p-2 rounded-md whitespace-pre-line">{selectedOrder.notes}</p>
                  </div>
                )}

                {/* Delivery Fee */}
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">🛵 Taxa de Entrega</p>
                  {editingDeliveryFee === selectedOrder.id ? (
                    <div className="flex items-center gap-2">
                      <span className="text-sm">R$</span>
                      <Input
                        type="number"
                        min="0"
                        step="0.50"
                        value={deliveryFeeValue}
                        onChange={(e) => setDeliveryFeeValue(e.target.value)}
                        className="w-24 h-8 text-sm"
                        autoFocus
                      />
                      <Button
                        size="sm"
                        className="h-8 text-xs"
                        onClick={() => updateDeliveryFee(selectedOrder.id, parseFloat(deliveryFeeValue) || 0)}
                      >
                        Salvar
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 text-xs"
                        onClick={() => setEditingDeliveryFee(null)}
                      >
                        Cancelar
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <p className="text-sm">R$ {Number(selectedOrder.delivery_fee || 0).toFixed(2)}</p>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-6 text-xs px-2"
                        onClick={() => {
                          setEditingDeliveryFee(selectedOrder.id);
                          setDeliveryFeeValue(String(selectedOrder.delivery_fee || 0));
                        }}
                      >
                        Editar
                      </Button>
                    </div>
                  )}
                </div>

                {/* Coupon Discount */}
                {selectedOrder.coupon_discount && Number(selectedOrder.coupon_discount) > 0 && (
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground">🎟️ Desconto Cupom</p>
                    <p className="text-sm text-green-600">-R$ {Number(selectedOrder.coupon_discount).toFixed(2)}</p>
                  </div>
                )}

                <div className="flex items-center justify-between pt-3 border-t">
                  <div>
                    <p className="text-xs text-muted-foreground">Total</p>
                    <p className="text-xl font-bold">
                      R$ {Number(selectedOrder.total_amount).toFixed(2)}
                    </p>
                  </div>
                  <Select
                    value={selectedOrder.status}
                    onValueChange={(value) => updateOrderStatus(selectedOrder.id, value)}
                  >
                    <SelectTrigger className="w-[140px] h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pendente</SelectItem>
                      <SelectItem value="preparing">Em Preparo</SelectItem>
                      <SelectItem value="on_the_way">A Caminho</SelectItem>
                      <SelectItem value="ready">Pronto</SelectItem>
                      <SelectItem value="delivered">Entregue</SelectItem>
                      <SelectItem value="cancelled">Cancelado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {selectedOrder.clients?.phone && (
                  <Button
                    variant="outline"
                    className="w-full gap-2"
                    onClick={() => {
                      window.open(
                        `https://wa.me/${selectedOrder.clients?.phone.replace(/\D/g, "")}?text=Olá%20${selectedOrder.clients?.name},%20seu%20pedido%20está%20${statusLabels[selectedOrder.status]}!`,
                        "_blank"
                      );
                    }}
                  >
                    <MessageCircle className="h-4 w-4" />
                    Enviar WhatsApp
                  </Button>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default Orders;