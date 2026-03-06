import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ShoppingCart, Trash2, Plus, Minus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";
import { z } from "zod";
import { validateBrazilianPhone } from "@/lib/utils";

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  selectedOptions?: {
    optionItemId: string;
    optionItemName: string;
    priceModifier: number;
  }[];
}

interface CartModalProps {
  isOpen: boolean;
  onClose: () => void;
  onContinue: () => void;
  onCheckout: () => void;
  items: CartItem[];
  restaurantId: string;
  guestCartId: string | null;
  onRemoveItem?: (itemId: string, selectedOptions?: CartItem['selectedOptions']) => void;
  onUpdateQuantity?: (itemId: string, quantity: number, selectedOptions?: CartItem['selectedOptions']) => void;
}

const checkoutSchema = z.object({
  name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  phone: z.string().refine(validateBrazilianPhone, {
    message: "WhatsApp inválido. Use DDD + número (ex: 85999998888)"
  }),
  address: z.string().min(5, "Endereço deve ter pelo menos 5 caracteres"),
});

export function CartModal({ isOpen, onClose, onContinue, onCheckout, items, restaurantId, guestCartId, onRemoveItem, onUpdateQuantity }: CartModalProps) {
  const [step, setStep] = useState<'cart' | 'data' | 'payment' | 'success'>('cart');
  const [loading, setLoading] = useState(false);
  const [savedCartId, setSavedCartId] = useState<string | null>(null);
  const [trackingCode, setTrackingCode] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    address: "",
    paymentMethod: "",
    needsChange: false,
    changeAmount: "",
    notes: "",
  });

  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const handleFinalizarClick = () => {
    setStep('data');
  };

  const handleDataSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const dataValidation = checkoutSchema.safeParse({
      name: formData.name,
      phone: formData.phone,
      address: formData.address,
    });
    
    if (!dataValidation.success) {
      toast.error(dataValidation.error.errors[0].message);
      return;
    }
    
    setLoading(true);

    try {
      // Chamar edge function segura
      const { data, error } = await supabase.functions.invoke("public-checkout", {
        body: {
          step: "save-data",
          restaurantId,
          name: formData.name,
          phone: formData.phone,
          address: formData.address,
          items: items.map(item => ({
            id: item.id,
            name: item.name,
            price: item.price,
            quantity: item.quantity,
            selectedOptions: item.selectedOptions,
          })),
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setSavedCartId(data.cartId);
      setStep('payment');
    } catch (error) {
      console.error("Erro ao salvar carrinho:", error);
      toast.error("Erro ao salvar dados. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  const handleFinalSubmit = async () => {
    if (!formData.paymentMethod) {
      toast.error("Selecione uma forma de pagamento");
      return;
    }

    if (formData.paymentMethod === "dinheiro" && formData.needsChange && !formData.changeAmount) {
      toast.error("Informe o valor para o troco");
      return;
    }

    if (!savedCartId) {
      toast.error("Erro: carrinho não encontrado");
      return;
    }

    setLoading(true);

    try {
      // Chamar edge function segura para finalizar
      const { data, error } = await supabase.functions.invoke("public-checkout", {
        body: {
          step: "finalize",
          restaurantId,
          cartId: savedCartId,
          paymentMethod: formData.paymentMethod,
          needsChange: formData.needsChange,
          changeAmount: formData.needsChange && formData.changeAmount ? parseFloat(formData.changeAmount) : null,
          notes: formData.notes || null,
          totalAmount: total,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      // Salvar código de rastreamento
      setTrackingCode(data.trackingCode || null);

      // Limpar carrinho local
      if (guestCartId) {
        localStorage.removeItem(`cartItems_${guestCartId}`);
        localStorage.removeItem(`guestCart_${restaurantId}`);
      }

      toast.success("Pedido realizado com sucesso!");
      setStep('success');
    } catch (error) {
      console.error("Erro ao processar pedido:", error);
      toast.error("Erro ao processar. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  const getTitle = () => {
    if (step === 'data') return "Seus Dados para Entrega";
    if (step === 'payment') return "Forma de Pagamento";
    if (step === 'success') return "Pedido Realizado!";
    return "Item Adicionado ao Carrinho";
  };

  const handleCloseSuccess = () => {
    setStep('cart');
    setFormData({
      name: "",
      phone: "",
      address: "",
      paymentMethod: "",
      needsChange: false,
      changeAmount: "",
      notes: "",
    });
    setTrackingCode(null);
    onClose();
    window.location.reload();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            {getTitle()}
          </DialogTitle>
        </DialogHeader>

        {step === 'cart' && (
          <div className="space-y-4">
            {items.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <ShoppingCart className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>Seu carrinho está vazio</p>
              </div>
            ) : (
              <>
                <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
                  {items.map((item, index) => (
                    <div key={`${item.id}-${index}`} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{item.name}</p>
                        {item.selectedOptions && item.selectedOptions.length > 0 && (
                          <p className="text-xs text-muted-foreground truncate">
                            {item.selectedOptions.map(o => o.optionItemName).join(', ')}
                          </p>
                        )}
                        <p className="text-sm font-semibold text-primary">
                          R$ {(item.price * item.quantity).toFixed(2)}
                        </p>
                      </div>
                      
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => {
                            if (item.quantity > 1 && onUpdateQuantity) {
                              onUpdateQuantity(item.id, item.quantity - 1, item.selectedOptions);
                            } else if (onRemoveItem) {
                              onRemoveItem(item.id, item.selectedOptions);
                            }
                          }}
                        >
                          {item.quantity === 1 ? (
                            <Trash2 className="h-4 w-4 text-destructive" />
                          ) : (
                            <Minus className="h-4 w-4" />
                          )}
                        </Button>
                        
                        <span className="w-8 text-center font-medium">{item.quantity}</span>
                        
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => onUpdateQuantity?.(item.id, item.quantity + 1, item.selectedOptions)}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                      
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => onRemoveItem?.(item.id, item.selectedOptions)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>

                <div className="border-t pt-3">
                  <div className="flex justify-between font-semibold text-lg">
                    <span>Total</span>
                    <span className="text-primary">R$ {total.toFixed(2)}</span>
                  </div>
                </div>
              </>
            )}

            <div className="flex flex-col gap-2">
              <Button 
                onClick={handleFinalizarClick} 
                size="lg" 
                className="w-full"
                disabled={items.length === 0}
              >
                Finalizar Pedido
              </Button>
              <Button onClick={onContinue} variant="outline" size="lg" className="w-full">
                Continuar Comprando
              </Button>
            </div>
          </div>
        )}

        {step === 'data' && (
          <form onSubmit={handleDataSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome Completo</Label>
              <Input
                id="name"
                placeholder="Seu nome"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">WhatsApp (DDD + número)</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="85999998888"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value.replace(/\D/g, "") })}
                maxLength={11}
                required
              />
              <p className="text-xs text-muted-foreground">
                Exemplo: 85999998888 (será salvo como +5585999998888)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Endereço de Entrega</Label>
              <Input
                id="address"
                placeholder="Rua, número, bairro"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Observações (Opcional)</Label>
              <Textarea
                id="notes"
                placeholder="Ex: Sem cebola, ponto da carne mal passada, etc."
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
              />
            </div>

            <div className="border-t pt-2">
              <div className="flex justify-between font-semibold text-lg">
                <span>Total</span>
                <span>R$ {total.toFixed(2)}</span>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Button type="submit" size="lg" className="w-full">
                Continuar
              </Button>
              <Button 
                type="button" 
                onClick={() => setStep('cart')} 
                variant="outline" 
                size="lg" 
                className="w-full"
              >
                Voltar
              </Button>
            </div>
          </form>
        )}

        {step === 'payment' && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="paymentMethod">Forma de Pagamento</Label>
              <Select
                value={formData.paymentMethod}
                onValueChange={(value) => setFormData({ ...formData, paymentMethod: value, needsChange: false, changeAmount: "" })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="dinheiro">Dinheiro</SelectItem>
                  <SelectItem value="pix">Pix</SelectItem>
                  <SelectItem value="credito">Cartão de Crédito</SelectItem>
                  <SelectItem value="debito">Cartão de Débito</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {formData.paymentMethod === "dinheiro" && (
              <div className="space-y-3 border-t pt-3">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="needsChange"
                    checked={formData.needsChange}
                    onChange={(e) => setFormData({ ...formData, needsChange: e.target.checked, changeAmount: "" })}
                    className="h-4 w-4"
                  />
                  <Label htmlFor="needsChange" className="cursor-pointer">Preciso de troco</Label>
                </div>

                {formData.needsChange && (
                  <div className="space-y-2">
                    <Label htmlFor="changeAmount">Troco para quanto?</Label>
                    <Input
                      id="changeAmount"
                      type="number"
                      placeholder="Ex: 50"
                      value={formData.changeAmount}
                      onChange={(e) => setFormData({ ...formData, changeAmount: e.target.value })}
                      required
                    />
                  </div>
                )}
              </div>
            )}

            <div className="border-t pt-2">
              <div className="flex justify-between font-semibold text-lg">
                <span>Total</span>
                <span>R$ {total.toFixed(2)}</span>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Button 
                onClick={handleFinalSubmit} 
                size="lg" 
                className="w-full" 
                disabled={loading}
              >
                {loading ? "Processando..." : "Confirmar Pedido"}
              </Button>
              <Button 
                type="button" 
                onClick={() => setStep('data')} 
                variant="outline" 
                size="lg" 
                className="w-full"
              >
                Voltar
              </Button>
            </div>
          </div>
        )}

        {step === 'success' && (
          <div className="space-y-6 text-center">
            <div className="flex justify-center">
              <div className="rounded-full bg-green-100 p-3">
                <svg
                  className="h-12 w-12 text-green-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="text-xl font-semibold">Pedido Confirmado!</h3>
              <p className="text-sm text-muted-foreground">
                Seu pedido foi recebido e está sendo preparado
              </p>
            </div>

            {trackingCode && (
              <div className="space-y-3 p-4 bg-muted rounded-lg">
                <p className="text-sm font-medium">Código de Rastreamento:</p>
                <div className="flex items-center justify-center gap-2">
                  <code className="text-2xl font-bold tracking-wider bg-background px-4 py-2 rounded border-2 border-primary">
                    {trackingCode}
                  </code>
                </div>
                <p className="text-xs text-muted-foreground">
                  Salve este código para acompanhar seu pedido
                </p>
              </div>
            )}

            <div className="pt-4 border-t">
              <p className="text-sm text-muted-foreground mb-4">
                Você receberá atualizações sobre o status do seu pedido
              </p>
              <Button onClick={handleCloseSuccess} size="lg" className="w-full">
                Fechar
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
