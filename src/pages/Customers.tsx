import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  MessageSquare, Phone, User, Search, Crown, TrendingDown, Clock,
  ArrowUpDown, CalendarDays, DollarSign, ShoppingBag, AlertTriangle, Users
} from "lucide-react";
import { toast } from "sonner";

interface Client {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  notes: string | null;
  tags: string[] | null;
  created_at: string;
  orders: {
    id: string;
    total_amount: number;
    created_at: string;
    status: string | null;
  }[];
}

type SortOption = "most_orders" | "most_spent" | "recent" | "oldest" | "inactive";

const INACTIVE_DAYS = 30;

const Customers = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [notes, setNotes] = useState("");
  const [newTag, setNewTag] = useState("");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("most_orders");
  const [activeTab, setActiveTab] = useState("all");

  useEffect(() => {
    loadClients();
  }, []);

  const loadClients = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data, error } = await supabase
        .from("clients")
        .select("*, orders(id, total_amount, created_at, status)")
        .eq("restaurant_id", user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      setClients(data || []);
    } catch {
      toast.error("Erro ao carregar clientes");
    } finally {
      setLoading(false);
    }
  };

  const getTotalSpent = (orders: Client["orders"]) =>
    orders.reduce((s, o) => s + Number(o.total_amount), 0);

  const getLastOrderDate = (orders: Client["orders"]) => {
    if (!orders.length) return null;
    return new Date(Math.max(...orders.map(o => new Date(o.created_at).getTime())));
  };

  const getDaysSinceLastOrder = (orders: Client["orders"]) => {
    const last = getLastOrderDate(orders);
    if (!last) return Infinity;
    return Math.floor((Date.now() - last.getTime()) / (1000 * 60 * 60 * 24));
  };

  const isInactive = (orders: Client["orders"]) => {
    return orders.length > 0 && getDaysSinceLastOrder(orders) >= INACTIVE_DAYS;
  };

  const stats = useMemo(() => {
    const total = clients.length;
    const active = clients.filter(c => c.orders.length > 0 && getDaysSinceLastOrder(c.orders) < INACTIVE_DAYS).length;
    const inactive = clients.filter(c => isInactive(c.orders)).length;
    const topSpender = clients.reduce((best, c) => getTotalSpent(c.orders) > getTotalSpent(best.orders) ? c : best, clients[0]);
    const totalRevenue = clients.reduce((s, c) => s + getTotalSpent(c.orders), 0);
    const avgTicket = clients.reduce((s, c) => s + c.orders.length, 0);
    return { total, active, inactive, topSpender, totalRevenue, avgOrders: avgTicket > 0 ? totalRevenue / avgTicket : 0 };
  }, [clients]);

  const filtered = useMemo(() => {
    let list = [...clients];

    // search
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(c => c.name.toLowerCase().includes(q) || c.phone.includes(q) || (c.email && c.email.toLowerCase().includes(q)));
    }

    // tab filter
    if (activeTab === "top") {
      list = list.filter(c => c.orders.length >= 3);
    } else if (activeTab === "inactive") {
      list = list.filter(c => isInactive(c.orders));
    } else if (activeTab === "new") {
      list = list.filter(c => c.orders.length <= 1);
    }

    // sort
    switch (sortBy) {
      case "most_orders":
        list.sort((a, b) => b.orders.length - a.orders.length);
        break;
      case "most_spent":
        list.sort((a, b) => getTotalSpent(b.orders) - getTotalSpent(a.orders));
        break;
      case "recent":
        list.sort((a, b) => {
          const da = getLastOrderDate(a.orders)?.getTime() || 0;
          const db = getLastOrderDate(b.orders)?.getTime() || 0;
          return db - da;
        });
        break;
      case "oldest":
        list.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        break;
      case "inactive":
        list.sort((a, b) => getDaysSinceLastOrder(b.orders) - getDaysSinceLastOrder(a.orders));
        break;
    }
    return list;
  }, [clients, search, sortBy, activeTab]);

  const sendWhatsApp = (phone: string, name: string, reactivation = false) => {
    const sanitized = phone.replace(/\D/g, "");
    const msg = reactivation
      ? `Olá ${name}! 😊 Sentimos sua falta! Faz um tempinho que você não faz um pedido conosco. Que tal dar uma olhada no nosso cardápio? Temos novidades esperando por você! 🍕`
      : `Olá ${name}!`;
    window.open(`https://wa.me/${sanitized}?text=${encodeURIComponent(msg)}`, "_blank");
  };

  const updateClientNotes = async () => {
    if (!selectedClient) return;
    try {
      const { error } = await supabase.from("clients").update({ notes }).eq("id", selectedClient.id);
      if (error) throw error;
      toast.success("Anotações atualizadas!");
      loadClients();
    } catch {
      toast.error("Erro ao atualizar anotações");
    }
  };

  const addTag = async () => {
    if (!selectedClient || !newTag.trim()) return;
    try {
      const updatedTags = [...(selectedClient.tags || []), newTag.trim()];
      const { error } = await supabase.from("clients").update({ tags: updatedTags }).eq("id", selectedClient.id);
      if (error) throw error;
      toast.success("Tag adicionada!");
      setNewTag("");
      loadClients();
      setSelectedClient({ ...selectedClient, tags: updatedTags });
    } catch {
      toast.error("Erro ao adicionar tag");
    }
  };

  const removeTag = async (tagToRemove: string) => {
    if (!selectedClient) return;
    try {
      const updatedTags = (selectedClient.tags || []).filter(t => t !== tagToRemove);
      const { error } = await supabase.from("clients").update({ tags: updatedTags }).eq("id", selectedClient.id);
      if (error) throw error;
      toast.success("Tag removida!");
      loadClients();
      setSelectedClient({ ...selectedClient, tags: updatedTags });
    } catch {
      toast.error("Erro ao remover tag");
    }
  };

  const getClientRank = (orders: Client["orders"]) => {
    const count = orders.length;
    if (count >= 10) return { label: "VIP", color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" };
    if (count >= 5) return { label: "Frequente", color: "bg-green-500/20 text-green-400 border-green-500/30" };
    if (count >= 2) return { label: "Recorrente", color: "bg-blue-500/20 text-blue-400 border-blue-500/30" };
    return { label: "Novo", color: "bg-muted text-muted-foreground border-border" };
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">Clientes</h1>
          <p className="text-muted-foreground">CRM completo com histórico e reativação</p>
        </div>

        {/* Stats Cards */}
        {clients.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-4 pb-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center shrink-0">
                  <Users className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.total}</p>
                  <p className="text-xs text-muted-foreground">Total de clientes</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center shrink-0">
                  <Crown className="w-5 h-5 text-green-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.active}</p>
                  <p className="text-xs text-muted-foreground">Ativos (30 dias)</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-destructive/20 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-5 h-5 text-destructive" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.inactive}</p>
                  <p className="text-xs text-muted-foreground">Inativos</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-yellow-500/20 flex items-center justify-center shrink-0">
                  <DollarSign className="w-5 h-5 text-yellow-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">R$ {stats.avgOrders.toFixed(0)}</p>
                  <p className="text-xs text-muted-foreground">Ticket médio</p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, telefone ou email..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <ArrowUpDown className="w-4 h-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="most_orders">Mais pedidos</SelectItem>
              <SelectItem value="most_spent">Mais gastou</SelectItem>
              <SelectItem value="recent">Pedido recente</SelectItem>
              <SelectItem value="oldest">Mais antigo</SelectItem>
              <SelectItem value="inactive">Mais tempo sem comprar</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="all" className="gap-1.5">
              <Users className="w-3.5 h-3.5" /> Todos ({clients.length})
            </TabsTrigger>
            <TabsTrigger value="top" className="gap-1.5">
              <Crown className="w-3.5 h-3.5" /> Melhores
            </TabsTrigger>
            <TabsTrigger value="inactive" className="gap-1.5">
              <TrendingDown className="w-3.5 h-3.5" /> Inativos ({stats.inactive})
            </TabsTrigger>
            <TabsTrigger value="new" className="gap-1.5">
              <User className="w-3.5 h-3.5" /> Novos
            </TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-4">
            {/* Inactive alert banner */}
            {activeTab === "inactive" && stats.inactive > 0 && (
              <Card className="mb-4 border-destructive/30 bg-destructive/5">
                <CardContent className="py-4 flex flex-col sm:flex-row items-start sm:items-center gap-3">
                  <AlertTriangle className="w-5 h-5 text-destructive shrink-0" />
                  <div className="flex-1">
                    <p className="font-medium text-sm">
                      {stats.inactive} cliente(s) não compram há mais de {INACTIVE_DAYS} dias
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Envie uma mensagem pelo WhatsApp para reativá-los
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filtered.length === 0 ? (
                <Card className="col-span-full">
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <p className="text-muted-foreground">Nenhum cliente encontrado</p>
                  </CardContent>
                </Card>
              ) : (
                filtered.map((client) => {
                  const daysSince = getDaysSinceLastOrder(client.orders);
                  const inactive = isInactive(client.orders);
                  const rank = getClientRank(client.orders);
                  const lastDate = getLastOrderDate(client.orders);

                  return (
                    <Card key={client.id} className={`group hover:shadow-lg hover:shadow-primary/10 transition-all duration-300 ${inactive ? "border-destructive/30" : ""}`}>
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <CardTitle className="flex items-center gap-3 text-base">
                            <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center shrink-0">
                              <User className="w-5 h-5 text-primary" />
                            </div>
                            <div className="min-w-0">
                              <span className="block truncate">{client.name}</span>
                              <span className="text-xs font-normal text-muted-foreground flex items-center gap-1">
                                <Phone className="w-3 h-3" /> {client.phone}
                              </span>
                            </div>
                          </CardTitle>
                          <Badge variant="outline" className={`text-[10px] shrink-0 ${rank.color}`}>
                            {rank.label}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3 pt-0">
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div className="flex items-center gap-1.5 text-muted-foreground">
                            <ShoppingBag className="w-3.5 h-3.5" />
                            <span>{client.orders.length} pedidos</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-muted-foreground">
                            <DollarSign className="w-3.5 h-3.5" />
                            <span>R$ {getTotalSpent(client.orders).toFixed(0)}</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-muted-foreground col-span-2">
                            <CalendarDays className="w-3.5 h-3.5" />
                            <span>
                              {lastDate
                                ? `Último pedido: ${lastDate.toLocaleDateString("pt-BR")} (${daysSince === 0 ? "hoje" : `${daysSince}d atrás`})`
                                : "Sem pedidos"}
                            </span>
                          </div>
                        </div>

                        {inactive && (
                          <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-2.5 flex items-center gap-2">
                            <Clock className="w-4 h-4 text-destructive shrink-0" />
                            <span className="text-xs text-destructive font-medium">
                              Inativo há {daysSince} dias
                            </span>
                          </div>
                        )}

                        {client.tags && client.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {client.tags.map((tag, i) => (
                              <Badge key={i} variant="secondary" className="text-[10px]">{tag}</Badge>
                            ))}
                          </div>
                        )}

                        <div className="flex gap-2 pt-1">
                          {inactive ? (
                            <Button
                              variant="default"
                              size="sm"
                              className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                              onClick={() => sendWhatsApp(client.phone, client.name, true)}
                            >
                              <MessageSquare className="w-4 h-4 mr-1.5" />
                              Reativar via WhatsApp
                            </Button>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex-1"
                              onClick={() => sendWhatsApp(client.phone, client.name)}
                            >
                              <MessageSquare className="w-4 h-4 mr-1.5" />
                              WhatsApp
                            </Button>
                          )}
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setSelectedClient(client);
                                  setNotes(client.notes || "");
                                }}
                              >
                                Detalhes
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
                              <DialogHeader>
                                <div className="flex items-center gap-3">
                                  <DialogTitle>{client.name}</DialogTitle>
                                  <Badge variant="outline" className={rank.color}>{rank.label}</Badge>
                                </div>
                                <DialogDescription className="flex items-center gap-4">
                                  <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {client.phone}</span>
                                  {client.email && <span>{client.email}</span>}
                                </DialogDescription>
                              </DialogHeader>

                              {/* Client Summary */}
                              <div className="grid grid-cols-3 gap-3 py-2">
                                <div className="text-center p-3 rounded-xl bg-muted/50">
                                  <p className="text-2xl font-bold">{client.orders.length}</p>
                                  <p className="text-xs text-muted-foreground">Pedidos</p>
                                </div>
                                <div className="text-center p-3 rounded-xl bg-muted/50">
                                  <p className="text-2xl font-bold">R$ {getTotalSpent(client.orders).toFixed(0)}</p>
                                  <p className="text-xs text-muted-foreground">Total gasto</p>
                                </div>
                                <div className="text-center p-3 rounded-xl bg-muted/50">
                                  <p className="text-2xl font-bold">
                                    {client.orders.length > 0
                                      ? `R$ ${(getTotalSpent(client.orders) / client.orders.length).toFixed(0)}`
                                      : "-"}
                                  </p>
                                  <p className="text-xs text-muted-foreground">Ticket médio</p>
                                </div>
                              </div>

                              {inactive && (
                                <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <AlertTriangle className="w-4 h-4 text-destructive" />
                                    <span className="text-sm font-medium text-destructive">Inativo há {daysSince} dias</span>
                                  </div>
                                  <Button
                                    size="sm"
                                    className="bg-green-600 hover:bg-green-700 text-white"
                                    onClick={() => sendWhatsApp(client.phone, client.name, true)}
                                  >
                                    <MessageSquare className="w-4 h-4 mr-1" /> Reativar
                                  </Button>
                                </div>
                              )}

                              {/* Notes */}
                              <div className="space-y-2">
                                <Label htmlFor="notes">Anotações</Label>
                                <Textarea
                                  id="notes"
                                  value={notes}
                                  onChange={e => setNotes(e.target.value)}
                                  placeholder="Adicione anotações sobre este cliente..."
                                  rows={3}
                                />
                                <Button size="sm" onClick={updateClientNotes}>Salvar Anotações</Button>
                              </div>

                              {/* Tags */}
                              <div className="space-y-2">
                                <Label>Tags</Label>
                                <div className="flex gap-1.5 flex-wrap">
                                  {selectedClient?.tags?.map((tag, i) => (
                                    <Badge key={i} variant="secondary" className="cursor-pointer" onClick={() => removeTag(tag)}>
                                      {tag} ×
                                    </Badge>
                                  ))}
                                </div>
                                <div className="flex gap-2">
                                  <Input
                                    value={newTag}
                                    onChange={e => setNewTag(e.target.value)}
                                    placeholder="Nova tag..."
                                    onKeyDown={e => { if (e.key === "Enter") addTag(); }}
                                  />
                                  <Button onClick={addTag} size="sm">Adicionar</Button>
                                </div>
                              </div>

                              {/* Order History */}
                              <div className="space-y-2">
                                <Label>Histórico de Pedidos</Label>
                                <div className="space-y-2 max-h-64 overflow-y-auto">
                                  {client.orders.length === 0 ? (
                                    <p className="text-sm text-muted-foreground">Nenhum pedido realizado</p>
                                  ) : (
                                    [...client.orders]
                                      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                                      .map(order => (
                                        <div key={order.id} className="flex justify-between items-center text-sm p-3 rounded-xl bg-secondary/30 border border-border/50">
                                          <div>
                                            <span className="font-medium">{new Date(order.created_at).toLocaleDateString("pt-BR")}</span>
                                            <span className="text-muted-foreground ml-2 text-xs">
                                              {new Date(order.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                                            </span>
                                          </div>
                                          <span className="font-semibold text-primary">R$ {Number(order.total_amount).toFixed(2)}</span>
                                        </div>
                                      ))
                                  )}
                                </div>
                              </div>
                            </DialogContent>
                          </Dialog>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default Customers;
