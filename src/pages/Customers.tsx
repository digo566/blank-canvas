import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { MessageSquare, Phone, User } from "lucide-react";
import { toast } from "sonner";

interface Client {
  id: string;
  name: string;
  phone: string;
  notes: string | null;
  tags: string[] | null;
  created_at: string;
  orders: {
    id: string;
    total_amount: number;
    created_at: string;
  }[];
}

const Customers = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [notes, setNotes] = useState("");
  const [newTag, setNewTag] = useState("");

  useEffect(() => {
    loadClients();
  }, []);

  const loadClients = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("clients")
        .select(`
          *,
          orders(id, total_amount, created_at)
        `)
        .eq("restaurant_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setClients(data || []);
    } catch (error: any) {
      toast.error("Erro ao carregar clientes");
    } finally {
      setLoading(false);
    }
  };

  const updateClientNotes = async () => {
    if (!selectedClient) return;

    try {
      const { error } = await supabase
        .from("clients")
        .update({ notes })
        .eq("id", selectedClient.id);

      if (error) throw error;
      toast.success("Anotações atualizadas!");
      loadClients();
    } catch (error: any) {
      toast.error("Erro ao atualizar anotações");
    }
  };

  const addTag = async () => {
    if (!selectedClient || !newTag.trim()) return;

    try {
      const currentTags = selectedClient.tags || [];
      const updatedTags = [...currentTags, newTag.trim()];

      const { error } = await supabase
        .from("clients")
        .update({ tags: updatedTags })
        .eq("id", selectedClient.id);

      if (error) throw error;
      toast.success("Tag adicionada!");
      setNewTag("");
      loadClients();
      setSelectedClient({ ...selectedClient, tags: updatedTags });
    } catch (error: any) {
      toast.error("Erro ao adicionar tag");
    }
  };

  const removeTag = async (tagToRemove: string) => {
    if (!selectedClient) return;

    try {
      const updatedTags = (selectedClient.tags || []).filter((tag) => tag !== tagToRemove);

      const { error } = await supabase
        .from("clients")
        .update({ tags: updatedTags })
        .eq("id", selectedClient.id);

      if (error) throw error;
      toast.success("Tag removida!");
      loadClients();
      setSelectedClient({ ...selectedClient, tags: updatedTags });
    } catch (error: any) {
      toast.error("Erro ao remover tag");
    }
  };

  const getTotalSpent = (orders: Client["orders"]) => {
    return orders.reduce((sum, order) => sum + Number(order.total_amount), 0);
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
        <div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">Clientes</h1>
          <p className="text-muted-foreground">CRM e histórico de clientes</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {clients.length === 0 ? (
            <Card className="col-span-full">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <p className="text-muted-foreground">
                  Nenhum cliente cadastrado ainda
                </p>
              </CardContent>
            </Card>
          ) : (
            clients.map((client) => (
              <Card key={client.id} className="group hover:shadow-lg hover:shadow-primary/10 transition-all duration-300">
                <CardHeader>
                  <CardTitle className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                      <User className="w-5 h-5 text-primary" />
                    </div>
                    {client.name}
                  </CardTitle>
                  <CardDescription className="flex items-center gap-2">
                    <Phone className="w-3 h-3" />
                    {client.phone}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Total de Pedidos:</span>
                      <span className="font-semibold">{client.orders.length}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Total Gasto:</span>
                      <span className="font-semibold">
                        R$ {getTotalSpent(client.orders).toFixed(2)}
                      </span>
                    </div>
                  </div>

                  {client.tags && client.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {client.tags.map((tag, index) => (
                        <Badge key={index} variant="secondary">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => {
                        const sanitizedPhone = client.phone.replace(/\D/g, "");
                        const sanitizedName = encodeURIComponent(client.name);
                        window.open(
                          `https://wa.me/${sanitizedPhone}?text=Olá%20${sanitizedName}!`,
                          "_blank"
                        );
                      }}
                    >
                      <MessageSquare className="w-4 h-4 mr-2" />
                      WhatsApp
                    </Button>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          variant="outline"
                          onClick={() => {
                            setSelectedClient(client);
                            setNotes(client.notes || "");
                          }}
                        >
                          Ver Detalhes
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl">
                        <DialogHeader>
                          <DialogTitle>{client.name}</DialogTitle>
                          <DialogDescription>{client.phone}</DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <Label htmlFor="notes">Anotações</Label>
                            <Textarea
                              id="notes"
                              value={notes}
                              onChange={(e) => setNotes(e.target.value)}
                              placeholder="Adicione anotações sobre este cliente..."
                            />
                            <Button
                              size="sm"
                              className="mt-2"
                              onClick={updateClientNotes}
                            >
                              Salvar Anotações
                            </Button>
                          </div>

                          <div>
                            <Label>Tags</Label>
                            <div className="flex gap-2 mt-2 mb-2 flex-wrap">
                              {selectedClient?.tags?.map((tag, index) => (
                                <Badge
                                  key={index}
                                  variant="secondary"
                                  className="cursor-pointer"
                                  onClick={() => removeTag(tag)}
                                >
                                  {tag} ×
                                </Badge>
                              ))}
                            </div>
                            <div className="flex gap-2">
                              <Input
                                value={newTag}
                                onChange={(e) => setNewTag(e.target.value)}
                                placeholder="Nova tag..."
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    addTag();
                                  }
                                }}
                              />
                              <Button onClick={addTag}>Adicionar</Button>
                            </div>
                          </div>

                          <div>
                            <Label>Histórico de Pedidos</Label>
                            <div className="space-y-2 mt-2">
                              {client.orders.length === 0 ? (
                                <p className="text-sm text-muted-foreground">
                                  Nenhum pedido realizado
                                </p>
                              ) : (
                                client.orders.map((order) => (
                                  <div
                                    key={order.id}
                                    className="flex justify-between text-sm p-3 rounded-xl bg-secondary/30 border border-border/50"
                                  >
                                    <span>
                                      {new Date(order.created_at).toLocaleDateString("pt-BR")}
                                    </span>
                                    <span className="font-semibold text-primary">
                                      R$ {Number(order.total_amount).toFixed(2)}
                                    </span>
                                  </div>
                                ))
                              )}
                            </div>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Customers;