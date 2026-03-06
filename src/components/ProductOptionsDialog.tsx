import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
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

interface SelectedOption {
  optionItemId: string;
  optionItemName: string;
  priceModifier: number;
}

interface ProductOptionsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (selectedOptions: SelectedOption[], totalPrice: number) => void;
  productId: string;
  productName: string;
  basePrice: number;
}

export function ProductOptionsDialog({
  isOpen,
  onClose,
  onConfirm,
  productId,
  productName,
  basePrice,
}: ProductOptionsDialogProps) {
  const [optionGroups, setOptionGroups] = useState<ProductOptionGroup[]>([]);
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);
  const [autoConfirmed, setAutoConfirmed] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setAutoConfirmed(false);
      setSelectedOptions({});
      loadOptions();
    }
  }, [isOpen, productId]);

  // Auto-confirmar quando não há opções
  useEffect(() => {
    if (!loading && optionGroups.length === 0 && isOpen && !autoConfirmed) {
      setAutoConfirmed(true);
      onConfirm([], basePrice);
      onClose();
    }
  }, [loading, optionGroups, isOpen, autoConfirmed, basePrice, onConfirm, onClose]);

  const loadOptions = async () => {
    setLoading(true);
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
      toast.error("Erro ao carregar opções do produto");
    } finally {
      setLoading(false);
    }
  };

  const handleCheckboxChange = (groupId: string, itemId: string, checked: boolean) => {
    setSelectedOptions((prev) => {
      const currentSelections = prev[groupId] || [];
      const group = optionGroups.find((g) => g.id === groupId);
      
      if (checked) {
        if (group && currentSelections.length >= group.max_selections) {
          toast.error(`Máximo de ${group.max_selections} seleção(ões) permitido(s)`);
          return prev;
        }
        return { ...prev, [groupId]: [...currentSelections, itemId] };
      } else {
        return { ...prev, [groupId]: currentSelections.filter((id) => id !== itemId) };
      }
    });
  };

  const handleRadioChange = (groupId: string, itemId: string) => {
    setSelectedOptions((prev) => ({ ...prev, [groupId]: [itemId] }));
  };

  const calculateTotal = () => {
    let total = basePrice;
    optionGroups.forEach((group) => {
      const selections = selectedOptions[group.id] || [];
      selections.forEach((itemId) => {
        const item = group.items.find((i) => i.id === itemId);
        if (item) {
          total += Number(item.price_modifier);
        }
      });
    });
    return total;
  };

  const handleConfirm = () => {
    // Validar seleções obrigatórias
    for (const group of optionGroups) {
      if (group.is_required) {
        const selections = selectedOptions[group.id] || [];
        if (selections.length === 0) {
          toast.error(`"${group.name}" é obrigatório`);
          return;
        }
      }
    }

    // Construir lista de opções selecionadas
    const selected: SelectedOption[] = [];
    optionGroups.forEach((group) => {
      const selections = selectedOptions[group.id] || [];
      selections.forEach((itemId) => {
        const item = group.items.find((i) => i.id === itemId);
        if (item) {
          selected.push({
            optionItemId: item.id,
            optionItemName: item.name,
            priceModifier: Number(item.price_modifier),
          });
        }
      });
    });

    onConfirm(selected, calculateTotal());
  };

  if (loading || optionGroups.length === 0) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent>
          <div className="flex items-center justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Personalize seu pedido - {productName}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {optionGroups.map((group) => (
            <div key={group.id} className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-base font-semibold">
                  {group.name}
                  {group.is_required && (
                    <span className="text-destructive ml-1">*</span>
                  )}
                </Label>
                {group.max_selections > 1 && (
                  <span className="text-xs text-muted-foreground">
                    Escolha até {group.max_selections}
                  </span>
                )}
              </div>

              {group.max_selections === 1 ? (
                <RadioGroup
                  value={selectedOptions[group.id]?.[0] || ""}
                  onValueChange={(value) => handleRadioChange(group.id, value)}
                >
                  {group.items?.map((item) => (
                    <div key={item.id} className="flex items-center space-x-2">
                      <RadioGroupItem value={item.id} id={item.id} />
                      <Label htmlFor={item.id} className="flex-1 cursor-pointer">
                        <span className="font-normal">{item.name}</span>
                        {item.price_modifier !== 0 && (
                          <span className="ml-2 text-muted-foreground">
                            + R$ {Number(item.price_modifier).toFixed(2)}
                          </span>
                        )}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              ) : (
                <div className="space-y-2">
                  {group.items?.map((item) => (
                    <div key={item.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={item.id}
                        checked={selectedOptions[group.id]?.includes(item.id) || false}
                        onCheckedChange={(checked) =>
                          handleCheckboxChange(group.id, item.id, checked as boolean)
                        }
                      />
                      <Label htmlFor={item.id} className="flex-1 cursor-pointer">
                        <span className="font-normal">{item.name}</span>
                        {item.price_modifier !== 0 && (
                          <span className="ml-2 text-muted-foreground">
                            + R$ {Number(item.price_modifier).toFixed(2)}
                          </span>
                        )}
                      </Label>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <div className="flex-1 text-lg font-semibold">
            Total: R$ {calculateTotal().toFixed(2)}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button onClick={handleConfirm}>Adicionar ao Carrinho</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
