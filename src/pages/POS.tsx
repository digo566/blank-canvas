import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { ShoppingBag, Plus, Minus, Trash2, CreditCard, Search, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

interface Product {
  id: string;
  name: string;
  price: number;
  image_url: string | null;
  category_id: string | null;
}

interface Category {
  id: string;
  name: string;
}

interface POSItem {
  product: Product;
  quantity: number;
}

const POS = () => {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [cart, setCart] = useState<POSItem[]>([]);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [paymentMethod, setPaymentMethod] = useState("dinheiro");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [tableNumber, setTableNumber] = useState("");
  const [customerName, setCustomerName] = useState("");

  useEffect(() => {
    if (user) loadData();
  }, [user]);

  const loadData = async () => {
    if (!user) return;
    const [productsRes, categoriesRes] = await Promise.all([
      supabase.from("products").select("id, name, price, image_url, category_id").eq("restaurant_id", user.id).eq("available", true).order("name"),
      supabase.from("product_categories").select("id, name").eq("restaurant_id", user.id).order("display_order"),
    ]);
    setProducts(productsRes.data || []);
    setCategories(categoriesRes.data || []);
    setLoading(false);
  };

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(i => i.product.id === product.id);
      if (existing) {
        return prev.map(i => i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart(prev => prev.map(i => {
      if (i.product.id === productId) {
        const newQty = i.quantity + delta;
        return newQty > 0 ? { ...i, quantity: newQty } : i;
      }
      return i;
    }).filter(i => i.quantity > 0));
  };

  const removeItem = (productId: string) => {
    setCart(prev => prev.filter(i => i.product.id !== productId));
  };

  const total = cart.reduce((sum, i) => sum + i.product.price * i.quantity, 0);

  const finalizeSale = async () => {
    if (!user || cart.length === 0) return;
    setSubmitting(true);

    try {
      // Create order
      const { data: order, error: orderError } = await supabase
        .from("orders")
        .insert({
          restaurant_id: user.id,
          total_amount: total,
          payment_method: paymentMethod,
          status: "preparing",
          order_type: tableNumber ? "dine_in" : "counter",
          table_number: tableNumber || null,
          notes: `🏪 Pedido via PDV (Balcão)${customerName ? `\n👤 Cliente: ${customerName}` : ""}`,
        })
        .select("id, tracking_code")
        .single();

      if (orderError) throw orderError;

      // Create order items
      const items = cart.map(i => ({
        order_id: order.id,
        product_id: i.product.id,
        quantity: i.quantity,
        unit_price: i.product.price,
        subtotal: i.product.price * i.quantity,
      }));

      const { error: itemsError } = await supabase.from("order_items").insert(items);
      if (itemsError) throw itemsError;

      toast.success(`Pedido #${order.tracking_code} criado com sucesso!`);
      setCart([]);
      setTableNumber("");
      setCustomerName("");
    } catch (error: any) {
      toast.error("Erro ao criar pedido: " + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = selectedCategory === "all" || p.category_id === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col lg:flex-row">
      {/* Products Panel */}
      <div className="flex-1 p-4 space-y-4 overflow-auto">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/dashboard"><ArrowLeft className="h-5 w-5" /></Link>
          </Button>
          <ShoppingBag className="h-6 w-6 text-primary" />
          <h1 className="text-xl font-bold">PDV - Ponto de Venda</h1>
        </div>

        {/* Search & Filter */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input className="pl-9" placeholder="Buscar produto..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              {categories.map(c => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Products Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {filteredProducts.map(product => (
            <Card
              key={product.id}
              className="cursor-pointer hover:ring-2 hover:ring-primary transition-all p-3 space-y-2"
              onClick={() => addToCart(product)}
            >
              {product.image_url && (
                <div className="aspect-square rounded-md overflow-hidden bg-muted">
                  <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                </div>
              )}
              <p className="font-medium text-sm line-clamp-2">{product.name}</p>
              <p className="text-primary font-bold text-sm">R$ {product.price.toFixed(2)}</p>
            </Card>
          ))}
        </div>
      </div>

      {/* Cart Panel */}
      <div className="w-full lg:w-96 border-t lg:border-t-0 lg:border-l bg-card flex flex-col">
        <div className="p-4 border-b">
          <h2 className="font-bold text-lg">Carrinho</h2>
          <Input
            className="mt-2"
            placeholder="Mesa (opcional)"
            value={tableNumber}
            onChange={e => setTableNumber(e.target.value)}
          />
        </div>

        <div className="flex-1 overflow-auto p-4 space-y-3">
          {cart.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">Carrinho vazio</p>
          ) : (
            cart.map(item => (
              <div key={item.product.id} className="flex items-center gap-3 bg-muted/50 rounded-lg p-3">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{item.product.name}</p>
                  <p className="text-xs text-muted-foreground">R$ {item.product.price.toFixed(2)} cada</p>
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => updateQuantity(item.product.id, -1)}>
                    <Minus className="h-3 w-3" />
                  </Button>
                  <span className="w-8 text-center font-bold text-sm">{item.quantity}</span>
                  <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => updateQuantity(item.product.id, 1)}>
                    <Plus className="h-3 w-3" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => removeItem(item.product.id)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Checkout */}
        <div className="border-t p-4 space-y-3">
          <Select value={paymentMethod} onValueChange={setPaymentMethod}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="dinheiro">💵 Dinheiro</SelectItem>
              <SelectItem value="pix">📱 PIX</SelectItem>
              <SelectItem value="credito">💳 Crédito</SelectItem>
              <SelectItem value="debito">💳 Débito</SelectItem>
            </SelectContent>
          </Select>

          <div className="flex items-center justify-between text-lg font-bold">
            <span>Total</span>
            <span className="text-primary">R$ {total.toFixed(2)}</span>
          </div>

          <Button
            className="w-full h-12 text-base"
            disabled={cart.length === 0 || submitting}
            onClick={finalizeSale}
          >
            <CreditCard className="h-5 w-5 mr-2" />
            {submitting ? "Processando..." : "Finalizar Venda"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default POS;
