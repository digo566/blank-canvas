import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Minus, ArrowUp, ArrowDown, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { InventoryItem } from "@/lib/finance/types";

interface Product {
  id: string;
  name: string;
}

export function InventoryManager() {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [movementDialogOpen, setMovementDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);

  const [newItem, setNewItem] = useState({
    ingredient_name: "",
    product_id: "",
    current_quantity: "",
    min_quantity: "",
    unit: "un",
    unit_cost: ""
  });

  const [movement, setMovement] = useState({
    quantity: "",
    type: "in" as "in" | "out",
    reason: ""
  });

  const fetchData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [inventoryRes, productsRes] = await Promise.all([
        supabase
          .from('inventory')
          .select('*, product:products(name)')
          .eq('restaurant_id', user.id)
          .order('ingredient_name', { ascending: true }),
        supabase
          .from('products')
          .select('id, name')
          .eq('restaurant_id', user.id)
      ]);

      if (inventoryRes.data) {
        setInventory(inventoryRes.data.map(i => ({
          ...i,
          product: i.product as { name: string } | undefined
        })));
      }
      if (productsRes.data) setProducts(productsRes.data);
    } catch (error) {
      console.error('Error fetching inventory:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAddItem = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase.from('inventory').insert({
        restaurant_id: user.id,
        ingredient_name: newItem.ingredient_name || null,
        product_id: newItem.product_id || null,
        current_quantity: parseFloat(newItem.current_quantity) || 0,
        min_quantity: parseFloat(newItem.min_quantity) || 0,
        unit: newItem.unit,
        unit_cost: parseFloat(newItem.unit_cost) || 0
      });

      if (error) throw error;

      toast.success("Item adicionado ao estoque");
      setDialogOpen(false);
      setNewItem({
        ingredient_name: "",
        product_id: "",
        current_quantity: "",
        min_quantity: "",
        unit: "un",
        unit_cost: ""
      });
      fetchData();
    } catch (error) {
      toast.error("Erro ao adicionar item");
    }
  };

  const handleMovement = async () => {
    if (!selectedItem) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const qty = parseFloat(movement.quantity);
      const newQuantity = movement.type === 'in' 
        ? selectedItem.current_quantity + qty 
        : selectedItem.current_quantity - qty;

      // Insert movement record
      await supabase.from('inventory_movements').insert({
        inventory_id: selectedItem.id,
        restaurant_id: user.id,
        quantity: qty,
        movement_type: movement.type,
        reason: movement.reason
      });

      // Update inventory quantity
      await supabase
        .from('inventory')
        .update({ 
          current_quantity: newQuantity,
          last_purchase_date: movement.type === 'in' ? new Date().toISOString().split('T')[0] : selectedItem.last_purchase_date
        })
        .eq('id', selectedItem.id);

      toast.success(`${movement.type === 'in' ? 'Entrada' : 'Saída'} registrada`);
      setMovementDialogOpen(false);
      setMovement({ quantity: "", type: "in", reason: "" });
      setSelectedItem(null);
      fetchData();
    } catch (error) {
      toast.error("Erro ao registrar movimentação");
    }
  };

  const openMovementDialog = (item: InventoryItem, type: "in" | "out") => {
    setSelectedItem(item);
    setMovement({ ...movement, type });
    setMovementDialogOpen(true);
  };

  const lowStockItems = inventory.filter(i => i.current_quantity <= i.min_quantity);

  return (
    <div className="space-y-4">
      {lowStockItems.length > 0 && (
        <Card className="border-l-4 border-l-yellow-500 bg-yellow-500/5">
          <CardContent className="py-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              <span className="font-medium">{lowStockItems.length} itens precisam de reposição</span>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Controle de Estoque</CardTitle>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-1" />
                Novo Item
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Novo Item de Estoque</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div>
                  <Label>Nome do Ingrediente</Label>
                  <Input
                    value={newItem.ingredient_name}
                    onChange={(e) => setNewItem({ ...newItem, ingredient_name: e.target.value })}
                    placeholder="Ex: Farinha de Trigo"
                  />
                </div>
                <div>
                  <Label>Produto Relacionado (opcional)</Label>
                  <Select 
                    value={newItem.product_id} 
                    onValueChange={(v) => setNewItem({ ...newItem, product_id: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um produto" />
                    </SelectTrigger>
                    <SelectContent>
                      {products.map((prod) => (
                        <SelectItem key={prod.id} value={prod.id}>{prod.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Quantidade Atual</Label>
                    <Input
                      type="number"
                      value={newItem.current_quantity}
                      onChange={(e) => setNewItem({ ...newItem, current_quantity: e.target.value })}
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <Label>Quantidade Mínima</Label>
                    <Input
                      type="number"
                      value={newItem.min_quantity}
                      onChange={(e) => setNewItem({ ...newItem, min_quantity: e.target.value })}
                      placeholder="0"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Unidade</Label>
                    <Select 
                      value={newItem.unit} 
                      onValueChange={(v) => setNewItem({ ...newItem, unit: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="un">Unidade</SelectItem>
                        <SelectItem value="kg">Quilograma</SelectItem>
                        <SelectItem value="g">Grama</SelectItem>
                        <SelectItem value="l">Litro</SelectItem>
                        <SelectItem value="ml">Mililitro</SelectItem>
                        <SelectItem value="cx">Caixa</SelectItem>
                        <SelectItem value="pct">Pacote</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Custo Unitário</Label>
                    <Input
                      type="number"
                      value={newItem.unit_cost}
                      onChange={(e) => setNewItem({ ...newItem, unit_cost: e.target.value })}
                      placeholder="0.00"
                    />
                  </div>
                </div>
                <Button onClick={handleAddItem} className="w-full">Adicionar Item</Button>
              </div>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item</TableHead>
                <TableHead>Produto</TableHead>
                <TableHead className="text-center">Quantidade</TableHead>
                <TableHead className="text-center">Mínimo</TableHead>
                <TableHead className="text-right">Custo Unit.</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {inventory.map((item) => {
                const isLow = item.current_quantity <= item.min_quantity;
                return (
                  <TableRow key={item.id} className={isLow ? 'bg-yellow-500/5' : ''}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {isLow && <AlertTriangle className="h-4 w-4 text-yellow-500" />}
                        {item.ingredient_name || '-'}
                      </div>
                    </TableCell>
                    <TableCell>{item.product?.name || '-'}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant={isLow ? "destructive" : "secondary"}>
                        {item.current_quantity} {item.unit}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center text-muted-foreground">
                      {item.min_quantity} {item.unit}
                    </TableCell>
                    <TableCell className="text-right">
                      R$ {item.unit_cost.toFixed(2)}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => openMovementDialog(item, 'in')}
                        >
                          <ArrowUp className="h-4 w-4 text-green-500" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => openMovementDialog(item, 'out')}
                        >
                          <ArrowDown className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
              {inventory.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    Nenhum item no estoque
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Movement Dialog */}
      <Dialog open={movementDialogOpen} onOpenChange={setMovementDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {movement.type === 'in' ? 'Entrada de Estoque' : 'Saída de Estoque'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <p className="text-sm text-muted-foreground">
              Item: <strong>{selectedItem?.ingredient_name}</strong>
            </p>
            <p className="text-sm text-muted-foreground">
              Quantidade atual: <strong>{selectedItem?.current_quantity} {selectedItem?.unit}</strong>
            </p>
            <div>
              <Label>Quantidade</Label>
              <Input
                type="number"
                value={movement.quantity}
                onChange={(e) => setMovement({ ...movement, quantity: e.target.value })}
                placeholder="0"
              />
            </div>
            <div>
              <Label>Motivo (opcional)</Label>
              <Input
                value={movement.reason}
                onChange={(e) => setMovement({ ...movement, reason: e.target.value })}
                placeholder="Ex: Compra semanal"
              />
            </div>
            <Button 
              onClick={handleMovement} 
              className="w-full"
              variant={movement.type === 'in' ? 'default' : 'destructive'}
            >
              {movement.type === 'in' ? (
                <>
                  <Plus className="h-4 w-4 mr-1" />
                  Registrar Entrada
                </>
              ) : (
                <>
                  <Minus className="h-4 w-4 mr-1" />
                  Registrar Saída
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
