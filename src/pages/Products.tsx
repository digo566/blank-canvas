import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Pencil, Trash2, Store, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { ImageUpload } from "@/components/ImageUpload";
import { ProductOptionsManager } from "@/components/ProductOptionsManager";
import { CategoryManager } from "@/components/CategoryManager";

interface Category {
  id: string;
  name: string;
}

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  cost_price: number | null;
  profit_margin: number | null;
  image_url: string;
  available: boolean;
  category_id: string | null;
}

const Products = () => {
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: "",
    cost_price: "",
    image_url: "",
    available: true,
    category_id: "",
  });

  useEffect(() => {
    loadProducts();
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("product_categories")
        .select("*")
        .eq("restaurant_id", user.id)
        .order("display_order", { ascending: true });

      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error("Erro ao carregar categorias:", error);
    }
  };

  const loadProducts = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("restaurant_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setProducts(data || []);
    } catch (error: unknown) {
      toast.error("Erro ao carregar produtos");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.error("[Products] No user found");
        return;
      }

      const costPrice = formData.cost_price ? parseFloat(formData.cost_price) : 0;
      const price = parseFloat(formData.price);

      console.log("[Products] Submitting - editing:", !!editingProduct, "cost_price:", costPrice, "price:", price, "formData.cost_price:", formData.cost_price);

      if (editingProduct) {
        const updateData = {
          name: formData.name,
          description: formData.description,
          price,
          cost_price: costPrice,
          image_url: formData.image_url,
          available: formData.available,
          category_id: formData.category_id || null,
        };

        console.log("[Products] Update payload:", JSON.stringify(updateData));

        const { data: result, error } = await supabase
          .from("products")
          .update(updateData)
          .eq("id", editingProduct.id)
          .select();

        console.log("[Products] Update result:", result, "error:", error);

        if (error) throw error;
        toast.success("Produto atualizado com sucesso!");
      } else {
        const insertData = {
          restaurant_id: user.id,
          name: formData.name,
          description: formData.description,
          price,
          cost_price: costPrice,
          image_url: formData.image_url,
          available: formData.available,
          category_id: formData.category_id || null,
        };

        console.log("[Products] Insert payload:", JSON.stringify(insertData));

        const { data: result, error } = await supabase
          .from("products")
          .insert(insertData)
          .select();

        console.log("[Products] Insert result:", result, "error:", error);

        if (error) throw error;
        toast.success("Produto criado com sucesso!");
      }

      setDialogOpen(false);
      resetForm();
      loadProducts();
    } catch (error: any) {
      console.error("[Products] Save error:", error);
      toast.error("Erro ao salvar produto: " + (error.message || "Erro desconhecido"));
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este produto?")) return;

    try {
      const { error } = await supabase.from("products").delete().eq("id", id);
      if (error) throw error;
      toast.success("Produto excluído com sucesso!");
      loadProducts();
    } catch (error: any) {
      toast.error("Erro ao excluir produto");
    }
  };

  const openDialog = (product?: Product) => {
    if (product) {
      setEditingProduct(product);
      setFormData({
        name: product.name,
        description: product.description || "",
        price: product.price.toString(),
        cost_price: product.cost_price?.toString() || "",
        image_url: product.image_url || "",
        available: product.available,
        category_id: product.category_id || "",
      });
    } else {
      resetForm();
    }
    setDialogOpen(true);
  };

  const resetForm = () => {
    setEditingProduct(null);
    setFormData({
      name: "",
      description: "",
      price: "",
      cost_price: "",
      image_url: "",
      available: true,
      category_id: "",
    });
  };

  const getCategoryName = (categoryId: string | null) => {
    if (!categoryId) return null;
    const category = categories.find(c => c.id === categoryId);
    return category?.name || null;
  };

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
      <div className="space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">Produtos</h1>
            <p className="text-muted-foreground">Gerencie o cardápio do seu restaurante</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => navigate("/settings")}>
              <Store className="mr-2 h-4 w-4" />
              Personalizar Loja
            </Button>
            {userId && (
              <Button
                variant="outline"
                onClick={() => window.open(`/store/${userId}`, "_blank")}
              >
                <ExternalLink className="mr-2 h-4 w-4" />
                Ver Loja
              </Button>
            )}
            <Button onClick={() => openDialog()}>
              <Plus className="mr-2 h-4 w-4" />
              Novo Produto
            </Button>
          </div>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="sm:max-w-[525px] max-h-[90vh] flex flex-col">
            <DialogHeader className="flex-shrink-0">
              <DialogTitle>
                {editingProduct ? "Editar Produto" : "Novo Produto"}
              </DialogTitle>
              <DialogDescription>
                Preencha as informações do produto
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
              <div className="flex-1 overflow-y-auto px-1 space-y-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">Nome</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="description">Descrição</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={2}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="price">Preço de Venda (R$)</Label>
                    <Input
                      id="price"
                      type="number"
                      step="0.01"
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                      required
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="cost_price">Custo de Produção (R$)</Label>
                    <Input
                      id="cost_price"
                      type="number"
                      step="0.01"
                      placeholder="Insumos"
                      value={formData.cost_price}
                      onChange={(e) => setFormData({ ...formData, cost_price: e.target.value })}
                    />
                  </div>
                </div>
                {formData.price && formData.cost_price && parseFloat(formData.price) > 0 && (
                  <div className="p-3 bg-muted rounded-lg space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Margem de Contribuição:</span>
                      <span className="font-semibold text-primary">
                        R$ {(parseFloat(formData.price) - parseFloat(formData.cost_price)).toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Margem (%):</span>
                      <span className={`font-semibold ${
                        ((parseFloat(formData.price) - parseFloat(formData.cost_price)) / parseFloat(formData.price)) * 100 >= 30
                          ? 'text-green-600'
                          : 'text-orange-600'
                      }`}>
                        {(((parseFloat(formData.price) - parseFloat(formData.cost_price)) / parseFloat(formData.price)) * 100).toFixed(1)}%
                      </span>
                    </div>
                  </div>
                )}
                <div className="grid gap-2">
                  <Label>Imagem do Produto</Label>
                  <ImageUpload
                    bucket="product-images"
                    path={`product-${Date.now()}`}
                    currentImageUrl={formData.image_url}
                    onUploadComplete={(url) => setFormData({ ...formData, image_url: url })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="category">Categoria</Label>
                  <Select
                    value={formData.category_id || "none"}
                    onValueChange={(value) => setFormData({ ...formData, category_id: value === "none" ? "" : value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione uma categoria" />
                    </SelectTrigger>
                    <SelectContent className="bg-background border border-border z-50">
                      <SelectItem value="none">Sem categoria</SelectItem>
                      {categories.map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center justify-between py-2">
                  <Label htmlFor="available">Produto disponível</Label>
                  <Switch
                    id="available"
                    checked={formData.available}
                    onCheckedChange={(checked) => setFormData({ ...formData, available: checked })}
                  />
                </div>
              </div>
              <DialogFooter className="flex-shrink-0 pt-4 border-t border-border">
                <Button type="submit" className="w-full sm:w-auto">
                  {editingProduct ? "Atualizar" : "Criar"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        <CategoryManager onCategoriesChange={loadCategories} />

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {products.length === 0 ? (
            <Card className="col-span-full">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <p className="text-muted-foreground mb-4">
                  Nenhum produto cadastrado ainda
                </p>
                <Button onClick={() => openDialog()}>
                  <Plus className="mr-2 h-4 w-4" />
                  Criar Primeiro Produto
                </Button>
              </CardContent>
            </Card>
          ) : (
            products.map((product) => (
              <Card key={product.id} className="group hover:shadow-lg hover:shadow-primary/10 transition-all duration-300 overflow-hidden">
                <CardHeader className="p-0">
                  {product.image_url && (
                    <div className="relative overflow-hidden">
                      <img
                        src={product.image_url}
                        alt={product.name}
                        className="w-full h-48 object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-card/80 to-transparent" />
                    </div>
                  )}
                  <div className="p-6 pb-2">
                    <div className="flex items-center gap-2 mb-1">
                      {getCategoryName(product.category_id) && (
                        <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                          {getCategoryName(product.category_id)}
                        </span>
                      )}
                      {!product.available && (
                        <span className="text-xs bg-destructive/20 text-destructive border border-destructive/30 px-2 py-1 rounded-full">
                          Indisponível
                        </span>
                      )}
                    </div>
                    <CardTitle>{product.name}</CardTitle>
                    <CardDescription className="line-clamp-2">{product.description}</CardDescription>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-2xl font-bold text-primary">
                      R$ {product.price.toFixed(2)}
                    </p>
                    <div className="flex gap-2">
                      <Button
                        size="icon"
                        variant="outline"
                        className="border-border/50 hover:bg-primary/10 hover:border-primary/30"
                        onClick={() => openDialog(product)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="outline"
                        className="border-border/50 hover:bg-destructive/10 hover:border-destructive/30 hover:text-destructive"
                        onClick={() => handleDelete(product.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  {product.cost_price != null && product.cost_price > 0 && (
                    <div className="flex items-center gap-2 mb-4 text-sm">
                      <span className="text-muted-foreground">Margem:</span>
                      <span className={`font-semibold ${
                        product.profit_margin && product.profit_margin >= 30 ? 'text-green-600' : 'text-orange-600'
                      }`}>
                        {product.profit_margin?.toFixed(1)}%
                      </span>
                      {product.profit_margin && product.profit_margin >= 50 && (
                        <span title="Produto Estrela - Alta Margem">⭐</span>
                      )}
                    </div>
                  )}
                  <ProductOptionsManager
                    productId={product.id}
                    productName={product.name}
                  />
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Products;