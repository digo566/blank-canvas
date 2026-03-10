import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { QrCode, Plus, Trash2, Download, Eye, EyeOff } from "lucide-react";

interface RestaurantTable {
  id: string;
  table_number: string;
  is_active: boolean;
  created_at: string;
}

const TableQRCodes = () => {
  const { user } = useAuth();
  const [tables, setTables] = useState<RestaurantTable[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTableNumber, setNewTableNumber] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedQR, setSelectedQR] = useState<string | null>(null);

  useEffect(() => {
    if (user) loadTables();
  }, [user]);

  const loadTables = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from("restaurant_tables")
      .select("*")
      .eq("restaurant_id", user.id)
      .order("table_number", { ascending: true });

    if (error) {
      toast.error("Erro ao carregar mesas");
    } else {
      setTables(data || []);
    }
    setLoading(false);
  };

  const addTable = async () => {
    if (!user || !newTableNumber.trim()) return;
    const { error } = await supabase.from("restaurant_tables").insert({
      restaurant_id: user.id,
      table_number: newTableNumber.trim(),
    });
    if (error) {
      if (error.code === "23505") {
        toast.error("Já existe uma mesa com este número");
      } else {
        toast.error("Erro ao adicionar mesa");
      }
    } else {
      toast.success("Mesa adicionada!");
      setNewTableNumber("");
      setDialogOpen(false);
      loadTables();
    }
  };

  const toggleActive = async (id: string, currentActive: boolean) => {
    const { error } = await supabase
      .from("restaurant_tables")
      .update({ is_active: !currentActive })
      .eq("id", id);
    if (error) {
      toast.error("Erro ao atualizar mesa");
    } else {
      loadTables();
    }
  };

  const deleteTable = async (id: string) => {
    const { error } = await supabase.from("restaurant_tables").delete().eq("id", id);
    if (error) {
      toast.error("Erro ao excluir mesa");
    } else {
      toast.success("Mesa excluída");
      loadTables();
    }
  };

  const getQRUrl = (tableNumber: string) => {
    const storeUrl = `${window.location.origin}/store/${user?.id}?mesa=${tableNumber}`;
    return `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(storeUrl)}`;
  };

  const downloadQR = (tableNumber: string) => {
    const link = document.createElement("a");
    link.href = getQRUrl(tableNumber);
    link.download = `mesa-${tableNumber}-qrcode.png`;
    link.click();
  };

  const addBulkTables = async (count: number) => {
    if (!user) return;
    const existingNumbers = tables.map(t => parseInt(t.table_number)).filter(n => !isNaN(n));
    const maxExisting = existingNumbers.length > 0 ? Math.max(...existingNumbers) : 0;

    const newTables = Array.from({ length: count }, (_, i) => ({
      restaurant_id: user.id,
      table_number: String(maxExisting + i + 1),
    }));

    const { error } = await supabase.from("restaurant_tables").insert(newTables);
    if (error) {
      toast.error("Erro ao adicionar mesas");
    } else {
      toast.success(`${count} mesas adicionadas!`);
      loadTables();
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <QrCode className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-2xl font-bold">QR Code para Mesas</h1>
              <p className="text-sm text-muted-foreground">Gere QR codes que abrem o cardápio digital vinculado à mesa</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => addBulkTables(5)}>
              +5 Mesas
            </Button>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button><Plus className="h-4 w-4 mr-2" /> Nova Mesa</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Adicionar Mesa</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <Input
                    placeholder="Número da mesa (ex: 1, A1, VIP)"
                    value={newTableNumber}
                    onChange={(e) => setNewTableNumber(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addTable()}
                  />
                  <Button className="w-full" onClick={addTable} disabled={!newTableNumber.trim()}>
                    Adicionar
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
          </div>
        ) : tables.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <QrCode className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">Nenhuma mesa cadastrada</h3>
              <p className="text-muted-foreground mb-4">Adicione mesas para gerar QR codes do cardápio digital</p>
              <Button onClick={() => addBulkTables(10)}>
                <Plus className="h-4 w-4 mr-2" /> Adicionar 10 Mesas
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {tables.map((table) => (
              <Card key={table.id} className={`overflow-hidden ${!table.is_active ? "opacity-60" : ""}`}>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xl font-bold">Mesa {table.table_number}</span>
                    <Badge variant={table.is_active ? "default" : "secondary"}>
                      {table.is_active ? "Ativa" : "Inativa"}
                    </Badge>
                  </div>

                  {/* QR Code Preview */}
                  <div className="flex justify-center p-2 bg-white rounded-lg">
                    <img
                      src={getQRUrl(table.table_number)}
                      alt={`QR Code Mesa ${table.table_number}`}
                      className="w-40 h-40"
                      loading="lazy"
                    />
                  </div>

                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="flex-1" onClick={() => downloadQR(table.table_number)}>
                      <Download className="h-3 w-3 mr-1" /> Baixar
                    </Button>
                    <Button variant="outline" size="icon" onClick={() => toggleActive(table.id, table.is_active)}>
                      {table.is_active ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                    </Button>
                    <Button variant="destructive" size="icon" onClick={() => deleteTable(table.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default TableQRCodes;
