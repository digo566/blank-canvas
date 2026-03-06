import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Plus, 
  Pencil, 
  Trash2, 
  GripVertical, 
  Utensils, 
  Upload,
  X
} from "lucide-react";
import { toast } from "sonner";
import { CategorySelectionGrid } from "./CategorySelectionGrid";

interface Category {
  id: string;
  name: string;
  display_order: number;
  image_url?: string | null;
}

interface CategoryManagerProps {
  onCategoriesChange?: () => void;
}

export const CategoryManager = ({ onCategoriesChange }: CategoryManagerProps) => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [categoryName, setCategoryName] = useState("");
  const [selectedSuggestion, setSelectedSuggestion] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
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
      toast.error("Erro ao carregar categorias");
    } finally {
      setLoading(false);
    }
  };

  const handleSuggestionSelect = (name: string) => {
    setCategoryName(name);
    setSelectedSuggestion(name);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const uploadImage = async (file: File, userId: string): Promise<string | null> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}/${Date.now()}.${fileExt}`;
    
    const { error: uploadError } = await supabase.storage
      .from('category-images')
      .upload(fileName, file);

    if (uploadError) {
      console.error("Upload error:", uploadError);
      return null;
    }

    const { data } = supabase.storage
      .from('category-images')
      .getPublicUrl(fileName);

    return data.publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      let imageUrl: string | null = null;
      
      if (imageFile) {
        imageUrl = await uploadImage(imageFile, user.id);
      }

      if (editingCategory) {
        const updateData: { name: string; image_url?: string | null } = { name: categoryName };
        if (imageUrl) {
          updateData.image_url = imageUrl;
        }
        
        const { error } = await supabase
          .from("product_categories")
          .update(updateData)
          .eq("id", editingCategory.id);

        if (error) throw error;
        toast.success("Categoria atualizada!");
      } else {
        const maxOrder = categories.length > 0 
          ? Math.max(...categories.map(c => c.display_order)) + 1 
          : 0;

        const { error } = await supabase.from("product_categories").insert({
          restaurant_id: user.id,
          name: categoryName,
          display_order: maxOrder,
          image_url: imageUrl,
        });

        if (error) throw error;
        toast.success("Categoria criada!");
      }

      resetForm();
      loadCategories();
      onCategoriesChange?.();
    } catch (error) {
      toast.error("Erro ao salvar categoria");
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setShowCreateForm(false);
    setCategoryName("");
    setEditingCategory(null);
    setSelectedSuggestion(null);
    setImageFile(null);
    setImagePreview(null);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir esta categoria? Os produtos desta categoria ficarão sem categoria.")) return;

    try {
      const { error } = await supabase.from("product_categories").delete().eq("id", id);
      if (error) throw error;
      toast.success("Categoria excluída!");
      loadCategories();
      onCategoriesChange?.();
    } catch (error) {
      toast.error("Erro ao excluir categoria");
    }
  };

  const openEditForm = (category: Category) => {
    setEditingCategory(category);
    setCategoryName(category.name);
    setSelectedSuggestion(category.name);
    setImagePreview(category.image_url || null);
    setShowCreateForm(true);
  };

  const openCreateForm = () => {
    setEditingCategory(null);
    setCategoryName("");
    setSelectedSuggestion(null);
    setImagePreview(null);
    setImageFile(null);
    setShowCreateForm(true);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
        </CardContent>
      </Card>
    );
  }

  // Create/Edit Form View
  if (showCreateForm) {
    return (
      <Card className="overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between border-b border-border bg-muted/30">
          <CardTitle className="text-lg">
            {editingCategory ? "Editar Categoria" : "Nova Categoria"}
          </CardTitle>
          <Button variant="ghost" size="icon" onClick={resetForm}>
            <X className="h-5 w-5" />
          </Button>
        </CardHeader>
        
        <form onSubmit={handleSubmit}>
          <CardContent className="p-6 space-y-6">
            {/* Name Input */}
            <div className="space-y-2">
              <Label htmlFor="categoryName" className="text-sm font-medium text-foreground">
                Nome da Categoria
              </Label>
              <Input
                id="categoryName"
                value={categoryName}
                onChange={(e) => {
                  setCategoryName(e.target.value);
                  setSelectedSuggestion(null);
                }}
                placeholder="Ex: Pizzas, Bebidas, Sobremesas..."
                className="h-12 text-base"
                required
              />
            </div>

            {/* Image Upload */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground">
                Imagem de Capa (opcional)
              </Label>
              <div 
                className={`
                  relative border-2 border-dashed rounded-xl p-6 transition-all cursor-pointer
                  ${imagePreview 
                    ? 'border-primary bg-primary/5' 
                    : 'border-border hover:border-primary/50 hover:bg-muted/50'
                  }
                `}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                />
                
                {imagePreview ? (
                  <div className="relative">
                    <img 
                      src={imagePreview} 
                      alt="Preview" 
                      className="w-full h-32 object-cover rounded-lg"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      className="absolute top-2 right-2 h-8 w-8"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeImage();
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center text-muted-foreground">
                    <div className="p-3 rounded-full bg-muted mb-3">
                      <Upload className="h-6 w-6" />
                    </div>
                    <p className="text-sm font-medium">Clique para fazer upload</p>
                    <p className="text-xs mt-1">PNG, JPG até 5MB</p>
                  </div>
                )}
              </div>
            </div>

            {/* Category Selection Grid */}
            <CategorySelectionGrid 
              onSelect={handleSuggestionSelect}
              selectedCategory={selectedSuggestion}
            />
          </CardContent>

          {/* Save Button */}
          <div className="p-6 pt-0">
            <Button 
              type="submit" 
              className="w-full h-12 text-base font-semibold"
              disabled={!categoryName.trim() || saving}
            >
              {saving ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-foreground"></div>
                  Salvando...
                </div>
              ) : (
                <>
                  {editingCategory ? "Atualizar Categoria" : "Salvar Categoria"}
                </>
              )}
            </Button>
          </div>
        </form>
      </Card>
    );
  }

  // Categories List View
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">Categorias</CardTitle>
        <Button size="sm" onClick={openCreateForm} className="gap-2">
          <Plus className="h-4 w-4" />
          Nova Categoria
        </Button>
      </CardHeader>
      <CardContent>
        {categories.length === 0 ? (
          <div className="text-center py-12">
            <div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
              <Utensils className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground font-medium">
              Nenhuma categoria criada ainda
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Crie categorias para organizar seu cardápio
            </p>
            <Button onClick={openCreateForm} className="mt-4 gap-2">
              <Plus className="h-4 w-4" />
              Criar primeira categoria
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {categories.map((category) => (
              <div
                key={category.id}
                className="flex items-center justify-between p-3 rounded-xl border border-border bg-card hover:bg-accent/30 transition-all duration-200 group"
              >
                <div className="flex items-center gap-3">
                  <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
                  {category.image_url ? (
                    <img 
                      src={category.image_url} 
                      alt={category.name}
                      className="h-10 w-10 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Utensils className="h-5 w-5 text-primary" />
                    </div>
                  )}
                  <span className="font-medium text-foreground">{category.name}</span>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8"
                    onClick={() => openEditForm(category)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 hover:text-destructive hover:bg-destructive/10"
                    onClick={() => handleDelete(category.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
