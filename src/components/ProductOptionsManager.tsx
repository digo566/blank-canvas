import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2, Settings } from "lucide-react";
import { toast } from "sonner";

interface ProductOptionGroup {
  id: string;
  name: string;
  is_required: boolean;
  min_selections: number;
  max_selections: number;
  items: ProductOptionItem[];
}

interface ProductOptionItem {
  id: string;
  name: string;
  price_modifier: number;
}

interface ProductOptionsManagerProps {
  productId: string;
  productName: string;
}

export function ProductOptionsManager({ productId, productName }: ProductOptionsManagerProps) {
  const [optionGroups, setOptionGroups] = useState<ProductOptionGroup[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [groupFormData, setGroupFormData] = useState({
    name: "",
    is_required: false,
    max_selections: 1,
  });
  const [itemFormData, setItemFormData] = useState({
    groupId: "",
    name: "",
    price_modifier: "",
  });

  useEffect(() => {
    loadOptions();
  }, [productId]);

  const loadOptions = async () => {
    try {
      const { data: groups, error } = await supabase
        .from("product_option_groups")
        .select(`
          *,
          items:product_option_items(*)
        `)
        .eq("product_id", productId)
        .order("created_at");

      if (error) throw error;
      setOptionGroups((groups || []) as any);
    } catch (error) {
      console.error("Erro ao carregar opções:", error);
    }
  };

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { error } = await supabase.from("product_option_groups").insert({
        product_id: productId,
        name: groupFormData.name,
        is_required: groupFormData.is_required,
        max_selections: groupFormData.max_selections,
      });

      if (error) throw error;
      toast.success("Grupo de opções criado!");
      setGroupFormData({ name: "", is_required: false, max_selections: 1 });
      setDialogOpen(false);
      loadOptions();
    } catch (error) {
      console.error("Erro:", error);
      toast.error("Erro ao criar grupo");
    }
  };

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { error } = await supabase.from("product_option_items").insert({
        option_group_id: itemFormData.groupId,
        name: itemFormData.name,
        price_modifier: parseFloat(itemFormData.price_modifier) || 0,
      });

      if (error) throw error;
      toast.success("Item adicionado!");
      setItemFormData({ groupId: "", name: "", price_modifier: "" });
      loadOptions();
    } catch (error) {
      console.error("Erro:", error);
      toast.error("Erro ao adicionar item");
    }
  };

  const handleDeleteGroup = async (groupId: string) => {
    if (!confirm("Excluir este grupo de opções?")) return;
    try {
      const { error } = await supabase
        .from("product_option_groups")
        .delete()
        .eq("id", groupId);

      if (error) throw error;
      toast.success("Grupo excluído!");
      loadOptions();
    } catch (error) {
      toast.error("Erro ao excluir grupo");
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    if (!confirm("Excluir este item?")) return;
    try {
      const { error } = await supabase
        .from("product_option_items")
        .delete()
        .eq("id", itemId);

      if (error) throw error;
      toast.success("Item excluído!");
      loadOptions();
    } catch (error) {
      toast.error("Erro ao excluir item");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Opções e Adicionais - {productName}
        </h3>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Novo Grupo
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Criar Grupo de Opções</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateGroup} className="space-y-4">
              <div className="space-y-2">
                <Label>Nome do Grupo</Label>
                <Input
                  placeholder="Ex: Tamanho, Adicionais, Acompanhamentos"
                  value={groupFormData.name}
                  onChange={(e) => setGroupFormData({ ...groupFormData, name: e.target.value })}
                  required
                />
              </div>
              <div className="flex items-center justify-between">
                <Label>Obrigatório?</Label>
                <Switch
                  checked={groupFormData.is_required}
                  onCheckedChange={(checked) =>
                    setGroupFormData({ ...groupFormData, is_required: checked })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Máximo de seleções</Label>
                <Input
                  type="number"
                  min="1"
                  value={groupFormData.max_selections}
                  onChange={(e) =>
                    setGroupFormData({ ...groupFormData, max_selections: parseInt(e.target.value) })
                  }
                  required
                />
              </div>
              <Button type="submit" className="w-full">
                Criar Grupo
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {optionGroups.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Nenhum grupo de opções configurado para este produto.
        </p>
      ) : (
        <div className="space-y-4">
          {optionGroups.map((group) => (
            <Card key={group.id}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {group.name}
                  {group.is_required && (
                    <span className="ml-2 text-xs text-destructive">(Obrigatório)</span>
                  )}
                  <span className="ml-2 text-xs text-muted-foreground">
                    Max: {group.max_selections}
                  </span>
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDeleteGroup(group.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {group.items?.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between text-sm p-2 bg-muted rounded"
                    >
                      <span>
                        {item.name}
                        {item.price_modifier !== 0 && (
                          <span className="ml-2 text-muted-foreground">
                            + R$ {Number(item.price_modifier).toFixed(2)}
                          </span>
                        )}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteItem(item.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                  <form onSubmit={handleAddItem} className="flex gap-2 pt-2">
                    <Input
                      placeholder="Nome do item"
                      value={itemFormData.groupId === group.id ? itemFormData.name : ""}
                      onChange={(e) =>
                        setItemFormData({ ...itemFormData, groupId: group.id, name: e.target.value })
                      }
                      required
                    />
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="+ R$"
                      className="w-24"
                      value={itemFormData.groupId === group.id ? itemFormData.price_modifier : ""}
                      onChange={(e) =>
                        setItemFormData({
                          ...itemFormData,
                          groupId: group.id,
                          price_modifier: e.target.value,
                        })
                      }
                    />
                    <Button type="submit" size="sm">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </form>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
