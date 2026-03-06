import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShoppingCart, MessageSquare, Phone } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

interface AbandonedCart {
  id: string;
  created_at: string;
  abandoned_at: string;
  contacted: boolean;
  clients: {
    name: string;
    phone: string;
  };
  cart_items: {
    quantity: number;
    products: {
      name: string;
      price: number;
    };
  }[];
}

export default function AbandonedCarts() {
  const [carts, setCarts] = useState<AbandonedCart[]>([]);
  const [loading, setLoading] = useState(true);
  const [restaurantName, setRestaurantName] = useState("");

  useEffect(() => {
    loadAbandonedCarts();
    
    // Chamar função para marcar carrinhos abandonados
    markAbandoned();
    
    // Atualizar a cada minuto
    const interval = setInterval(() => {
      markAbandoned();
      loadAbandonedCarts();
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  const markAbandoned = async () => {
    try {
      await supabase.rpc("mark_abandoned_carts");
    } catch (error) {
      console.error("Erro ao marcar carrinhos abandonados:", error);
    }
  };

  const loadAbandonedCarts = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Load restaurant name
      const { data: profile } = await supabase
        .from("profiles")
        .select("restaurant_name")
        .eq("id", user.id)
        .single();
      if (profile) setRestaurantName(profile.restaurant_name);

      const { data, error } = await supabase
        .from("carts")
        .select(`
          *,
          clients(name, phone),
          cart_items(quantity, products(name, price))
        `)
        .eq("restaurant_id", user.id)
        .eq("is_abandoned", true)
        .order("abandoned_at", { ascending: false });

      if (error) throw error;
      setCarts(data as any);
    } catch (error) {
      console.error("Erro ao carregar carrinhos:", error);
      toast.error("Erro ao carregar carrinhos abandonados");
    } finally {
      setLoading(false);
    }
  };

  const handleContact = async (cart: AbandonedCart, restaurantName: string) => {
    try {
      const items = cart.cart_items
        .map((item) => `${item.quantity}x ${item.products.name}`)
        .join(", ");
      
      const message = encodeURIComponent(
        `Olá ${cart.clients.name}, vi que você esqueceu alguns itens no carrinho da ${restaurantName}. Posso te oferecer um mimo para você finalizar agora? 🍔`
      );
      
      const phone = cart.clients.phone.replace(/\D/g, "");
      window.open(`https://wa.me/${phone}?text=${message}`, "_blank");

      // Marcar como contactado
      await supabase
        .from("carts")
        .update({ contacted: true })
        .eq("id", cart.id);

      toast.success("WhatsApp aberto! Não se esqueça de enviar a mensagem.");
      loadAbandonedCarts();
    } catch (error) {
      console.error("Erro ao contatar cliente:", error);
      toast.error("Erro ao abrir WhatsApp");
    }
  };

  const getTotal = (cart: AbandonedCart) => {
    return cart.cart_items.reduce(
      (sum, item) => sum + item.products.price * item.quantity,
      0
    );
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Carrinhos Abandonados</h1>
          <p className="text-muted-foreground">
            Clientes que adicionaram itens mas não finalizaram o pedido
          </p>
        </div>

        {carts.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <ShoppingCart className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Nenhum carrinho abandonado</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {carts.map((cart) => (
              <Card key={cart.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        {cart.clients.name}
                        {cart.contacted && (
                          <Badge variant="secondary">Contatado</Badge>
                        )}
                      </CardTitle>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                        <Phone className="h-4 w-4" />
                        {cart.clients.phone}
                      </div>
                    </div>
                    <div className="text-right text-sm">
                      <p className="text-muted-foreground">Abandonado há</p>
                      <p className="font-semibold">
                        {Math.round(
                          (new Date().getTime() - new Date(cart.abandoned_at).getTime()) / 60000
                        )}{" "}
                        min
                      </p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    {cart.cart_items.map((item, idx) => (
                      <div key={idx} className="flex justify-between text-sm">
                        <span>
                          {item.quantity}x {item.products.name}
                        </span>
                        <span>R$ {(item.products.price * item.quantity).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>

                  <div className="border-t pt-2 flex justify-between font-semibold">
                    <span>Total</span>
                    <span>R$ {getTotal(cart).toFixed(2)}</span>
                  </div>

                  <Button
                    onClick={() => handleContact(cart, restaurantName)}
                    className="w-full bg-green-600 hover:bg-green-700 text-white"
                    disabled={cart.contacted}
                  >
                    <MessageSquare className="h-4 w-4 mr-2" />
                    {cart.contacted ? "Cliente já Contatado" : "📱 Recuperar via WhatsApp"}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
