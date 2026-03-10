import { useEffect, useState } from "react";
import { useParams, Link, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ShoppingCart, Store, Package, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { CartModal } from "@/components/CartModal";
import { ProductOptionsDialog } from "@/components/ProductOptionsDialog";

interface Category {
  id: string;
  name: string;
  display_order: number;
  image_url?: string | null;
}

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  image_url: string;
  available: boolean;
  category_id: string | null;
}

interface CartItem extends Product {
  quantity: number;
  selectedOptions?: {
    optionItemId: string;
    optionItemName: string;
    priceModifier: number;
  }[];
  finalPrice: number;
}

interface RestaurantInfo {
  restaurant_name: string;
  phone: string;
  logo_url: string | null;
  cover_url: string | null;
  min_delivery_time: number;
  max_delivery_time: number;
}

const PublicStore = () => {
  const { restaurantId } = useParams();
  const [searchParams] = useSearchParams();
  const tableNumber = searchParams.get("mesa") || null;
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [cartModalOpen, setCartModalOpen] = useState(false);
  const [optionsDialogOpen, setOptionsDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [restaurantInfo, setRestaurantInfo] = useState<RestaurantInfo | null>(null);
  const [guestCartId, setGuestCartId] = useState<string | null>(null);
  const [storeBlocked, setStoreBlocked] = useState(false);

  useEffect(() => {
    if (restaurantId) {
      loadStoreData();
      loadGuestCart();
    }
  }, [restaurantId]);

  // Limpar carrinho ao sair da página
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (guestCartId && restaurantId) {
        localStorage.removeItem(`cartItems_${guestCartId}`);
        localStorage.removeItem(`guestCart_${restaurantId}`);
        localStorage.removeItem(`cartTimestamp_${restaurantId}`);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [guestCartId, restaurantId]);

  const loadGuestCart = () => {
    const savedCartId = localStorage.getItem(`guestCart_${restaurantId}`);
    const savedTimestamp = localStorage.getItem(`cartTimestamp_${restaurantId}`);
    
    if (savedCartId && savedTimestamp) {
      const lastActivity = parseInt(savedTimestamp);
      const fifteenMinutes = 15 * 60 * 1000; // 15 minutos em ms
      const now = Date.now();
      
      // Verificar se passaram 15 minutos
      if (now - lastActivity > fifteenMinutes) {
        // Expirou - limpar tudo
        localStorage.removeItem(`cartItems_${savedCartId}`);
        localStorage.removeItem(`guestCart_${restaurantId}`);
        localStorage.removeItem(`cartTimestamp_${restaurantId}`);
        return;
      }
      
      setGuestCartId(savedCartId);
      const savedItems = localStorage.getItem(`cartItems_${savedCartId}`);
      if (savedItems) {
        setCart(JSON.parse(savedItems));
      }
    }
  };

  const loadStoreData = async () => {
    try {
      // Check subscription status first
      const { data: hasSubscription, error: subError } = await supabase
        .rpc("check_restaurant_subscription", { restaurant_id_param: restaurantId });

      if (!subError && hasSubscription === false) {
        setStoreBlocked(true);
        setLoading(false);
        return;
      }

      // Use secure RPC function to get public profile data (respects show_phone_publicly setting)
      const { data: profileData, error: profileError } = await supabase
        .rpc("get_public_profile_with_phone", { profile_id: restaurantId });

      if (profileError) throw profileError;
      
      if (!profileData || profileData.length === 0) {
        setRestaurantInfo(null);
        setLoading(false);
        return;
      }
      
      const profile = profileData[0];
      setRestaurantInfo({
        restaurant_name: profile.restaurant_name,
        phone: profile.phone || "",
        logo_url: profile.logo_url || null,
        cover_url: profile.cover_url || null,
        min_delivery_time: profile.min_delivery_time || 30,
        max_delivery_time: profile.max_delivery_time || 60,
      });

      // Use secure RPC function to get public products (excludes cost_price/profit_margin)
      const { data: productsData, error: productsError } = await supabase
        .rpc("get_public_products", { restaurant_id_param: restaurantId });

      if (productsError) throw productsError;
      
      setProducts(productsData || []);

      // Load categories with image_url - use service-level access via anon key (RLS allows public read)
      const { data: categoriesData, error: categoriesError } = await supabase
        .from("product_categories")
        .select("id, name, display_order, image_url")
        .eq("restaurant_id", restaurantId)
        .order("display_order", { ascending: true });

      if (categoriesError) {
        console.warn("Erro ao carregar categorias:", categoriesError);
        // Fallback: show products without category grouping
        setCategories([]);
      } else {
        setCategories(categoriesData || []);
      }
    } catch (error: unknown) {
      console.error("Erro ao carregar dados:", error);
      toast.error("Erro ao carregar dados da loja");
    } finally {
      setLoading(false);
    }
  };

  const createGuestCart = () => {
    const tempCartId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    setGuestCartId(tempCartId);
    localStorage.setItem(`guestCart_${restaurantId}`, tempCartId);
    localStorage.setItem(`cartTimestamp_${restaurantId}`, Date.now().toString());
    return tempCartId;
  };

  const handleProductClick = (product: Product) => {
    setSelectedProduct(product);
    setOptionsDialogOpen(true);
  };

  const handleOptionsConfirm = (
    selectedOptions: { optionItemId: string; optionItemName: string; priceModifier: number }[],
    finalPrice: number
  ) => {
    if (!selectedProduct) return;

    let cartId = guestCartId;
    
    if (!cartId) {
      cartId = createGuestCart();
    }

    const existingItem = cart.find(
      item => item.id === selectedProduct.id && 
      JSON.stringify(item.selectedOptions) === JSON.stringify(selectedOptions)
    );

    let updatedCart: CartItem[];
    if (existingItem) {
      updatedCart = cart.map(item =>
        item.id === selectedProduct.id && 
        JSON.stringify(item.selectedOptions) === JSON.stringify(selectedOptions)
          ? { ...item, quantity: item.quantity + 1 }
          : item
      );
    } else {
      updatedCart = [...cart, { 
        ...selectedProduct, 
        quantity: 1, 
        selectedOptions,
        finalPrice 
      }];
    }

    setCart(updatedCart);
    localStorage.setItem(`cartItems_${cartId}`, JSON.stringify(updatedCart));
    // Atualizar timestamp de última atividade
    localStorage.setItem(`cartTimestamp_${restaurantId}`, Date.now().toString());
    setOptionsDialogOpen(false);
    setCartModalOpen(true);
    toast.success("Produto adicionado ao carrinho!");
  };

  const handleRemoveItem = (itemId: string, selectedOptions?: CartItem['selectedOptions']) => {
    const updatedCart = cart.filter(item => 
      !(item.id === itemId && JSON.stringify(item.selectedOptions) === JSON.stringify(selectedOptions))
    );
    setCart(updatedCart);
    if (guestCartId) {
      localStorage.setItem(`cartItems_${guestCartId}`, JSON.stringify(updatedCart));
      localStorage.setItem(`cartTimestamp_${restaurantId}`, Date.now().toString());
    }
  };

  const handleUpdateQuantity = (itemId: string, quantity: number, selectedOptions?: CartItem['selectedOptions']) => {
    const updatedCart = cart.map(item => 
      item.id === itemId && JSON.stringify(item.selectedOptions) === JSON.stringify(selectedOptions)
        ? { ...item, quantity }
        : item
    );
    setCart(updatedCart);
    if (guestCartId) {
      localStorage.setItem(`cartItems_${guestCartId}`, JSON.stringify(updatedCart));
      localStorage.setItem(`cartTimestamp_${restaurantId}`, Date.now().toString());
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Carregando loja...</p>
        </div>
      </div>
    );
  }

  if (storeBlocked) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="p-8 text-center max-w-md">
          <Store className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
          <h1 className="text-2xl font-bold mb-2">Loja Temporariamente Indisponível</h1>
          <p className="text-muted-foreground">
            Esta loja está temporariamente fora do ar. Tente novamente mais tarde.
          </p>
        </Card>
      </div>
    );
  }

  if (!restaurantInfo) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="p-8 text-center max-w-md">
          <Store className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
          <h1 className="text-2xl font-bold mb-2">Loja não encontrada</h1>
          <p className="text-muted-foreground">
            A loja que você está procurando não existe ou não está mais disponível.
          </p>
        </Card>
      </div>
    );
  }

  const formatDeliveryTime = (min: number, max: number): string => {
    const formatTime = (minutes: number) => {
      if (minutes >= 60) {
        const hours = Math.floor(minutes / 60);
        const remainingMinutes = minutes % 60;
        if (remainingMinutes === 0) {
          return `${hours}h`;
        }
        return `${hours}h${remainingMinutes}min`;
      }
      return `${minutes} min`;
    };
    
    return `${formatTime(min)} - ${formatTime(max)}`;
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section with Cover Image - iFood Style */}
      <div className="relative">
        {/* Cover Image */}
        <div className="h-48 sm:h-64 w-full overflow-hidden">
          {restaurantInfo.cover_url ? (
            <img
              src={restaurantInfo.cover_url}
              alt={`Capa ${restaurantInfo.restaurant_name}`}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-r from-primary to-primary/60" />
          )}
        </div>

        {/* Logo Overlay */}
        <div className="absolute left-1/2 -translate-x-1/2 -bottom-12 sm:-bottom-16">
          <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-full border-4 border-background bg-card shadow-lg overflow-hidden flex items-center justify-center">
            {restaurantInfo.logo_url ? (
              <img
                src={restaurantInfo.logo_url}
                alt={`Logo ${restaurantInfo.restaurant_name}`}
                className="w-full h-full object-cover"
              />
            ) : (
              <Store className="h-12 w-12 sm:h-16 sm:w-16 text-primary" />
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="absolute top-4 right-4 flex items-center gap-2">
          <Button
            variant="secondary"
            size="icon"
            className="rounded-full bg-background/80 backdrop-blur-sm hover:bg-background"
            asChild
          >
            <Link to="/track">
              <Package className="h-5 w-5" />
            </Link>
          </Button>
          <Button
            variant="secondary"
            size="icon"
            className="rounded-full bg-background/80 backdrop-blur-sm hover:bg-background relative"
            onClick={() => setCartModalOpen(true)}
          >
            <ShoppingCart className="h-5 w-5" />
            {cart.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold">
                {cart.reduce((sum, item) => sum + item.quantity, 0)}
              </span>
            )}
          </Button>
        </div>
      </div>

      {/* Floating AI Chat Button */}
      <Link
        to={`/chat/${restaurantId}`}
        className="fixed bottom-6 right-6 z-50"
      >
        <Button
          size="lg"
          className="rounded-full shadow-lg h-14 w-14 sm:w-auto sm:px-5 gap-2"
        >
          <MessageCircle className="h-6 w-6" />
          <span className="hidden sm:inline font-semibold">Falar com Atendente</span>
        </Button>
      </Link>

      {/* Restaurant Info Card */}
      <div className="container mx-auto px-4">
        <Card className="mt-16 sm:mt-20 mb-6 shadow-lg border-0">
          <div className="p-6 text-center">
            <h1 className="text-2xl sm:text-3xl font-bold mb-2">{restaurantInfo.restaurant_name}</h1>
            
            <div className="flex items-center justify-center gap-2 text-muted-foreground mb-4">
              {restaurantInfo.phone && (
                <span className="text-sm">{restaurantInfo.phone}</span>
              )}
            </div>

            {/* Delivery Time Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-muted rounded-full">
              <span className="text-sm font-medium">🕐</span>
              <span className="text-sm font-semibold text-foreground">
                {formatDeliveryTime(restaurantInfo.min_delivery_time, restaurantInfo.max_delivery_time)}
              </span>
            </div>
          </div>
        </Card>
      </div>

      <main className="container mx-auto px-4 py-8">
        <h2 className="text-2xl font-bold mb-6">Nosso Cardápio</h2>
        
        {products.length === 0 ? (
          <Card>
            <div className="p-8 text-center text-muted-foreground">
              Nenhum produto disponível no momento
            </div>
          </Card>
        ) : (
          <div className="space-y-8">
            {/* Products with categories */}
            {categories.map((category) => {
              const categoryProducts = products.filter(p => p.category_id === category.id);
              if (categoryProducts.length === 0) return null;
              
              return (
                <div key={category.id} className="space-y-4">
                  {/* Category Header with Image */}
                  <div className="relative overflow-hidden rounded-2xl">
                    {category.image_url ? (
                      <div className="relative h-32 sm:h-40">
                        <img
                          src={category.image_url}
                          alt={category.name}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/30 to-transparent" />
                        <h3 className="absolute bottom-4 left-4 text-2xl sm:text-3xl font-bold text-white drop-shadow-lg">
                          {category.name}
                        </h3>
                      </div>
                    ) : (
                      <div className="h-20 bg-gradient-to-r from-primary to-primary/70 flex items-center rounded-2xl">
                        <h3 className="text-2xl font-bold text-primary-foreground px-4">
                          {category.name}
                        </h3>
                      </div>
                    )}
                  </div>
                  
                  {/* Products Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {categoryProducts.map((product) => (
                      <Card key={product.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                        {product.image_url && (
                          <div className="aspect-video overflow-hidden bg-muted">
                            <img
                              src={product.image_url}
                              alt={product.name}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        )}
                        <div className="p-4">
                          <h3 className="font-semibold text-lg mb-2">{product.name}</h3>
                          {product.description && (
                            <p className="text-sm text-muted-foreground mb-4">
                              {product.description}
                            </p>
                          )}
                          <div className="flex items-center justify-between">
                            <span className="text-xl font-bold text-primary">
                              R$ {product.price.toFixed(2)}
                            </span>
                            <Button onClick={() => handleProductClick(product)}>
                              <ShoppingCart className="h-4 w-4 mr-2" />
                              Adicionar
                            </Button>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              );
            })}

            {/* Products without category */}
            {(() => {
              const uncategorizedProducts = products.filter(p => !p.category_id);
              if (uncategorizedProducts.length === 0) return null;
              
              return (
                <div>
                  {categories.length > 0 && (
                    <h3 className="text-xl font-semibold mb-4">Outros</h3>
                  )}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {uncategorizedProducts.map((product) => (
                      <Card key={product.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                        {product.image_url && (
                          <div className="aspect-video overflow-hidden bg-muted">
                            <img
                              src={product.image_url}
                              alt={product.name}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        )}
                        <div className="p-4">
                          <h3 className="font-semibold text-lg mb-2">{product.name}</h3>
                          {product.description && (
                            <p className="text-sm text-muted-foreground mb-4">
                              {product.description}
                            </p>
                          )}
                          <div className="flex items-center justify-between">
                            <span className="text-xl font-bold text-primary">
                              R$ {product.price.toFixed(2)}
                            </span>
                            <Button onClick={() => handleProductClick(product)}>
                              <ShoppingCart className="h-4 w-4 mr-2" />
                              Adicionar
                            </Button>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              );
            })()}
          </div>
        )}
      </main>

      <CartModal
        isOpen={cartModalOpen}
        onClose={() => setCartModalOpen(false)}
        onContinue={() => setCartModalOpen(false)}
        onCheckout={() => {}}
        items={cart}
        restaurantId={restaurantId || ""}
        guestCartId={guestCartId}
        onRemoveItem={handleRemoveItem}
        onUpdateQuantity={handleUpdateQuantity}
        tableNumber={tableNumber}
      />

      {selectedProduct && (
        <ProductOptionsDialog
          isOpen={optionsDialogOpen}
          onClose={() => setOptionsDialogOpen(false)}
          onConfirm={(selectedOptions, finalPrice) => 
            handleOptionsConfirm(selectedOptions, finalPrice)
          }
          productId={selectedProduct.id}
          productName={selectedProduct.name}
          basePrice={selectedProduct.price}
        />
      )}
    </div>
  );
};

export default PublicStore;