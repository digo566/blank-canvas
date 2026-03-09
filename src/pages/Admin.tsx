import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Users, Store, ShoppingBag, TrendingUp, Trash2, ExternalLink, MessageSquare, Star, DollarSign } from "lucide-react";
import { RestaurantRevenuePanel } from "@/components/admin/RestaurantRevenuePanel";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Lead {
  id: string;
  name: string;
  email: string;
  whatsapp: string;
  restaurant_name: string;
  status: string;
  created_at: string;
}

interface Restaurant {
  id: string;
  restaurant_name: string;
  phone: string;
  created_at: string;
  totalOrders: number;
  totalRevenue: number;
}

interface SystemFeedback {
  id: string;
  restaurant_id: string;
  restaurant_name?: string;
  category: string;
  rating: number;
  message: string;
  created_at: string;
}

const Admin = () => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [feedbacks, setFeedbacks] = useState<SystemFeedback[]>([]);
  const [stats, setStats] = useState({ totalLeads: 0, totalRestaurants: 0, totalOrders: 0, totalRevenue: 0, totalFeedbacks: 0 });
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    checkAdmin();
  }, []);

  const checkAdmin = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin");

    if (roles && roles.length > 0) {
      setIsAdmin(true);
      loadData();
    } else {
      setIsAdmin(false);
      setLoading(false);
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const { data: leadsData } = await supabase
        .from("leads")
        .select("*")
        .order("created_at", { ascending: false });

      const { data: profilesData } = await supabase
        .from("profiles")
        .select("id, restaurant_name, phone, created_at")
        .order("created_at", { ascending: false });

      const { data: ordersData } = await supabase
        .from("orders")
        .select("restaurant_id, total_amount");

      // Load system feedbacks
      const { data: feedbacksData } = await supabase
        .from("system_feedback")
        .select("*")
        .order("created_at", { ascending: false });

      // Group orders by restaurant
      const revenueByRestaurant: Record<string, { orders: number; revenue: number }> = {};
      (ordersData || []).forEach((o) => {
        if (!revenueByRestaurant[o.restaurant_id]) {
          revenueByRestaurant[o.restaurant_id] = { orders: 0, revenue: 0 };
        }
        revenueByRestaurant[o.restaurant_id].orders += 1;
        revenueByRestaurant[o.restaurant_id].revenue += Number(o.total_amount);
      });

      const restaurantsWithRevenue: Restaurant[] = (profilesData || []).map((p) => ({
        ...p,
        totalOrders: revenueByRestaurant[p.id]?.orders || 0,
        totalRevenue: revenueByRestaurant[p.id]?.revenue || 0,
      }));

      // Map feedbacks with restaurant names
      const profileMap: Record<string, string> = {};
      (profilesData || []).forEach((p) => {
        profileMap[p.id] = p.restaurant_name;
      });

      const feedbacksWithNames: SystemFeedback[] = (feedbacksData || []).map((fb) => ({
        ...fb,
        restaurant_name: profileMap[fb.restaurant_id] || "Desconhecido",
      }));

      setLeads(leadsData || []);
      setRestaurants(restaurantsWithRevenue);
      setFeedbacks(feedbacksWithNames);
      setStats({
        totalLeads: leadsData?.length || 0,
        totalRestaurants: profilesData?.length || 0,
        totalOrders: ordersData?.length || 0,
        totalRevenue: ordersData?.reduce((sum, o) => sum + Number(o.total_amount), 0) || 0,
        totalFeedbacks: feedbacksData?.length || 0,
      });
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const updateLeadStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("leads").update({ status }).eq("id", id);
    if (error) {
      toast.error("Erro ao atualizar lead");
    } else {
      toast.success("Status atualizado!");
      setLeads(leads.map(l => l.id === id ? { ...l, status } : l));
    }
  };

  const deleteLead = async (id: string) => {
    const { error } = await supabase.from("leads").delete().eq("id", id);
    if (error) {
      toast.error("Erro ao excluir lead");
    } else {
      toast.success("Lead excluído!");
      setLeads(leads.filter(l => l.id !== id));
    }
  };

  const deleteFeedback = async (id: string) => {
    const { error } = await supabase.from("system_feedback").delete().eq("id", id);
    if (error) {
      toast.error("Erro ao excluir feedback");
    } else {
      toast.success("Feedback excluído!");
      setFeedbacks(feedbacks.filter(f => f.id !== id));
    }
  };

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      geral: "Geral",
      pedidos: "Pedidos",
      produtos: "Produtos",
      clientes: "Clientes",
      analytics: "Analytics",
      entrega: "Entrega",
      pagamentos: "Pagamentos",
      sugestao: "Sugestão",
      bug: "Bug",
    };
    return labels[category] || category;
  };

  if (!isAdmin && !loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-[60vh]">
          <p className="text-muted-foreground text-lg">Acesso restrito a administradores.</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Painel Administrativo</h1>
          <p className="text-muted-foreground">Visão geral da plataforma Grape</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/10">
                  <Users className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Leads</p>
                  <p className="text-2xl font-bold">{stats.totalLeads}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-500/10">
                  <Store className="h-5 w-5 text-green-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Restaurantes</p>
                  <p className="text-2xl font-bold">{stats.totalRestaurants}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-500/10">
                  <ShoppingBag className="h-5 w-5 text-purple-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Pedidos</p>
                  <p className="text-2xl font-bold">{stats.totalOrders}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-yellow-500/10">
                  <TrendingUp className="h-5 w-5 text-yellow-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Receita Total</p>
                  <p className="text-2xl font-bold">
                    R$ {stats.totalRevenue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="leads">
          <TabsList className="flex flex-wrap gap-1">
            <TabsTrigger value="leads">Leads ({leads.length})</TabsTrigger>
            <TabsTrigger value="restaurants">Restaurantes ({restaurants.length})</TabsTrigger>
            <TabsTrigger value="revenue">
              <DollarSign className="h-3.5 w-3.5 mr-1" />
              Faturamento
            </TabsTrigger>
            <TabsTrigger value="feedbacks">Opiniões ({feedbacks.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="leads" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Leads da Landing Page</CardTitle>
              </CardHeader>
              <CardContent>
                {leads.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">Nenhum lead ainda.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Nome</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>WhatsApp</TableHead>
                          <TableHead>Restaurante</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Data</TableHead>
                          <TableHead>Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {leads.map((lead) => (
                          <TableRow key={lead.id}>
                            <TableCell className="font-medium">{lead.name}</TableCell>
                            <TableCell>{lead.email}</TableCell>
                            <TableCell>{lead.whatsapp}</TableCell>
                            <TableCell>{lead.restaurant_name}</TableCell>
                            <TableCell>
                              <select
                                value={lead.status}
                                onChange={(e) => updateLeadStatus(lead.id, e.target.value)}
                                className="text-xs px-2 py-1 rounded bg-secondary border border-border"
                              >
                                <option value="new">Novo</option>
                                <option value="contacted">Contatado</option>
                                <option value="converted">Convertido</option>
                                <option value="lost">Perdido</option>
                              </select>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {format(new Date(lead.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                            </TableCell>
                            <TableCell>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="text-destructive hover:text-destructive"
                                onClick={() => deleteLead(lead.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="restaurants" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Restaurantes Cadastrados</CardTitle>
              </CardHeader>
              <CardContent>
                {restaurants.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">Nenhum restaurante ainda.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Restaurante</TableHead>
                          <TableHead>Telefone</TableHead>
                          <TableHead>Pedidos</TableHead>
                          <TableHead>Receita</TableHead>
                          <TableHead>Data de Cadastro</TableHead>
                          <TableHead>Cardápio</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {restaurants.map((r) => (
                          <TableRow key={r.id}>
                            <TableCell className="font-medium">{r.restaurant_name}</TableCell>
                            <TableCell>{r.phone}</TableCell>
                            <TableCell>{r.totalOrders}</TableCell>
                            <TableCell className="font-semibold">
                              R$ {r.totalRevenue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {format(new Date(r.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                            </TableCell>
                            <TableCell>
                              <Button
                                size="sm"
                                variant="outline"
                                className="gap-1.5"
                                onClick={() => window.open(`/store/${r.id}`, "_blank")}
                              >
                                <ExternalLink className="h-3.5 w-3.5" />
                                Ver cardápio
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="revenue" className="mt-4">
            <RestaurantRevenuePanel restaurants={restaurants.map(r => ({ id: r.id, restaurant_name: r.restaurant_name }))} />
          </TabsContent>

          <TabsContent value="feedbacks" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Opiniões dos Restaurantes
                </CardTitle>
              </CardHeader>
              <CardContent>
                {feedbacks.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">Nenhuma opinião registrada ainda.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Data</TableHead>
                          <TableHead>Restaurante</TableHead>
                          <TableHead>Categoria</TableHead>
                          <TableHead>Avaliação</TableHead>
                          <TableHead className="max-w-[300px]">Mensagem</TableHead>
                          <TableHead>Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {feedbacks.map((fb) => (
                          <TableRow key={fb.id}>
                            <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                              {format(new Date(fb.created_at), "dd/MM/yy HH:mm", { locale: ptBR })}
                            </TableCell>
                            <TableCell className="font-medium">{fb.restaurant_name}</TableCell>
                            <TableCell>
                              <Badge variant="secondary">{getCategoryLabel(fb.category)}</Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-0.5">
                                {[1, 2, 3, 4, 5].map((star) => (
                                  <Star
                                    key={star}
                                    className={`h-3.5 w-3.5 ${
                                      star <= fb.rating
                                        ? "text-yellow-500 fill-yellow-500"
                                        : "text-muted-foreground"
                                    }`}
                                  />
                                ))}
                              </div>
                            </TableCell>
                            <TableCell className="max-w-[300px]">
                              <p className="text-sm truncate" title={fb.message}>{fb.message}</p>
                            </TableCell>
                            <TableCell>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="text-destructive hover:text-destructive"
                                onClick={() => deleteFeedback(fb.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default Admin;