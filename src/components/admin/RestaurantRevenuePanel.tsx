import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, DollarSign, TrendingUp, ShoppingBag, BarChart3 } from "lucide-react";
import { format, subDays, startOfMonth, endOfMonth, subMonths, eachDayOfInterval, startOfDay, endOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";

interface Restaurant {
  id: string;
  restaurant_name: string;
}

interface OrderData {
  total_amount: number;
  created_at: string;
  status: string;
}

interface DailyRevenue {
  date: string;
  label: string;
  revenue: number;
  orders: number;
}

const presetRanges = [
  { label: "Hoje", getValue: () => ({ from: new Date(), to: new Date() }) },
  { label: "Últimos 7 dias", getValue: () => ({ from: subDays(new Date(), 6), to: new Date() }) },
  { label: "Últimos 30 dias", getValue: () => ({ from: subDays(new Date(), 29), to: new Date() }) },
  { label: "Este mês", getValue: () => ({ from: startOfMonth(new Date()), to: new Date() }) },
  { label: "Mês passado", getValue: () => ({ from: startOfMonth(subMonths(new Date(), 1)), to: endOfMonth(subMonths(new Date(), 1)) }) },
  { label: "Últimos 90 dias", getValue: () => ({ from: subDays(new Date(), 89), to: new Date() }) },
];

export function RestaurantRevenuePanel({ restaurants }: { restaurants: Restaurant[] }) {
  const [selectedRestaurant, setSelectedRestaurant] = useState<string>("all");
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: subDays(new Date(), 29),
    to: new Date(),
  });
  const [orders, setOrders] = useState<OrderData[]>([]);
  const [loading, setLoading] = useState(false);
  const [chartType, setChartType] = useState<"bar" | "line">("bar");

  useEffect(() => {
    loadRevenue();
  }, [selectedRestaurant, dateRange]);

  const loadRevenue = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("orders")
        .select("total_amount, created_at, status, restaurant_id")
        .neq("status", "cancelled")
        .gte("created_at", startOfDay(dateRange.from).toISOString())
        .lte("created_at", endOfDay(dateRange.to).toISOString())
        .order("created_at", { ascending: true });

      if (selectedRestaurant !== "all") {
        query = query.eq("restaurant_id", selectedRestaurant);
      }

      const { data, error } = await query;
      if (error) throw error;
      setOrders(data || []);
    } catch (error) {
      console.error("Error loading revenue:", error);
    } finally {
      setLoading(false);
    }
  };

  const dailyData = useMemo<DailyRevenue[]>(() => {
    const days = eachDayOfInterval({ start: dateRange.from, end: dateRange.to });
    return days.map(day => {
      const dayStr = format(day, "yyyy-MM-dd");
      const dayOrders = orders.filter(o => format(new Date(o.created_at), "yyyy-MM-dd") === dayStr);
      return {
        date: dayStr,
        label: format(day, "dd/MM", { locale: ptBR }),
        revenue: dayOrders.reduce((sum, o) => sum + Number(o.total_amount), 0),
        orders: dayOrders.length,
      };
    });
  }, [orders, dateRange]);

  const totals = useMemo(() => {
    const totalRevenue = orders.reduce((sum, o) => sum + Number(o.total_amount), 0);
    const totalOrders = orders.length;
    const avgTicket = totalOrders > 0 ? totalRevenue / totalOrders : 0;
    const bestDay = dailyData.reduce((best, d) => d.revenue > best.revenue ? d : best, { date: "", label: "-", revenue: 0, orders: 0 });
    return { totalRevenue, totalOrders, avgTicket, bestDay };
  }, [orders, dailyData]);

  // Restaurant-level breakdown when "all" is selected
  const restaurantBreakdown = useMemo(() => {
    if (selectedRestaurant !== "all") return [];
    const byRestaurant: Record<string, { revenue: number; orders: number }> = {};
    orders.forEach((o: any) => {
      const rid = o.restaurant_id;
      if (!byRestaurant[rid]) byRestaurant[rid] = { revenue: 0, orders: 0 };
      byRestaurant[rid].revenue += Number(o.total_amount);
      byRestaurant[rid].orders += 1;
    });
    return Object.entries(byRestaurant)
      .map(([id, data]) => ({
        id,
        name: restaurants.find(r => r.id === id)?.restaurant_name || "Desconhecido",
        ...data,
        avgTicket: data.orders > 0 ? data.revenue / data.orders : 0,
      }))
      .sort((a, b) => b.revenue - a.revenue);
  }, [orders, selectedRestaurant, restaurants]);

  const selectedName = selectedRestaurant === "all"
    ? "Todos os Restaurantes"
    : restaurants.find(r => r.id === selectedRestaurant)?.restaurant_name || "";

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Faturamento por Restaurante
          </CardTitle>
          <CardDescription>Visualize a receita detalhada por período</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-3">
            {/* Restaurant Selector */}
            <Select value={selectedRestaurant} onValueChange={setSelectedRestaurant}>
              <SelectTrigger className="w-[250px]">
                <SelectValue placeholder="Selecione um restaurante" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Restaurantes</SelectItem>
                {restaurants.map(r => (
                  <SelectItem key={r.id} value={r.id}>{r.restaurant_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Date From */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("w-[160px] justify-start text-left font-normal")}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {format(dateRange.from, "dd/MM/yyyy")}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={dateRange.from}
                  onSelect={(d) => d && setDateRange(prev => ({ ...prev, from: d }))}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>

            <span className="self-center text-muted-foreground">até</span>

            {/* Date To */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("w-[160px] justify-start text-left font-normal")}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {format(dateRange.to, "dd/MM/yyyy")}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={dateRange.to}
                  onSelect={(d) => d && setDateRange(prev => ({ ...prev, to: d }))}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Preset buttons */}
          <div className="flex flex-wrap gap-2">
            {presetRanges.map(preset => (
              <Button
                key={preset.label}
                variant="outline"
                size="sm"
                onClick={() => setDateRange(preset.getValue())}
                className="text-xs"
              >
                {preset.label}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <DollarSign className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Faturamento</p>
                <p className="text-xl font-bold">
                  R$ {totals.totalRevenue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <ShoppingBag className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Pedidos</p>
                <p className="text-xl font-bold">{totals.totalOrders}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-500/10">
                <TrendingUp className="h-5 w-5 text-purple-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Ticket Médio</p>
                <p className="text-xl font-bold">
                  R$ {totals.avgTicket.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-yellow-500/10">
                <CalendarIcon className="h-5 w-5 text-yellow-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Melhor Dia</p>
                <p className="text-sm font-bold">{totals.bestDay.label}</p>
                <p className="text-xs text-muted-foreground">
                  R$ {totals.bestDay.revenue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Chart */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">
              {selectedName} — Faturamento Diário
            </CardTitle>
            <div className="flex gap-1">
              <Button size="sm" variant={chartType === "bar" ? "default" : "outline"} onClick={() => setChartType("bar")}>
                Barras
              </Button>
              <Button size="sm" variant={chartType === "line" ? "default" : "outline"} onClick={() => setChartType("line")}>
                Linha
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center h-[300px]">
              <div className="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent" />
            </div>
          ) : dailyData.length === 0 ? (
            <p className="text-center text-muted-foreground py-12">Nenhum dado no período selecionado</p>
          ) : (
            <ResponsiveContainer width="100%" height={320}>
              {chartType === "bar" ? (
                <BarChart data={dailyData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="label" fontSize={11} tickLine={false} className="fill-muted-foreground" />
                  <YAxis fontSize={11} tickLine={false} className="fill-muted-foreground" tickFormatter={(v) => `R$${v}`} />
                  <Tooltip
                    formatter={(value: number) => [`R$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`, "Faturamento"]}
                    labelFormatter={(label) => `Dia: ${label}`}
                    contentStyle={{ borderRadius: "8px", border: "1px solid hsl(var(--border))", background: "hsl(var(--card))" }}
                  />
                  <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              ) : (
                <LineChart data={dailyData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="label" fontSize={11} tickLine={false} className="fill-muted-foreground" />
                  <YAxis fontSize={11} tickLine={false} className="fill-muted-foreground" tickFormatter={(v) => `R$${v}`} />
                  <Tooltip
                    formatter={(value: number) => [`R$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`, "Faturamento"]}
                    labelFormatter={(label) => `Dia: ${label}`}
                    contentStyle={{ borderRadius: "8px", border: "1px solid hsl(var(--border))", background: "hsl(var(--card))" }}
                  />
                  <Line type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              )}
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Restaurant Breakdown Table (when viewing all) */}
      {selectedRestaurant === "all" && restaurantBreakdown.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Ranking de Faturamento por Restaurante</CardTitle>
            <CardDescription>
              {format(dateRange.from, "dd/MM/yyyy")} — {format(dateRange.to, "dd/MM/yyyy")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>Restaurante</TableHead>
                    <TableHead className="text-right">Pedidos</TableHead>
                    <TableHead className="text-right">Ticket Médio</TableHead>
                    <TableHead className="text-right">Faturamento</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {restaurantBreakdown.map((r, i) => (
                    <TableRow key={r.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelectedRestaurant(r.id)}>
                      <TableCell>
                        <Badge variant={i < 3 ? "default" : "secondary"} className="w-7 justify-center">
                          {i + 1}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">{r.name}</TableCell>
                      <TableCell className="text-right">{r.orders}</TableCell>
                      <TableCell className="text-right">
                        R$ {r.avgTicket.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        R$ {r.revenue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Daily Details Table */}
      {dailyData.some(d => d.orders > 0) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Detalhamento Diário</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead className="text-right">Pedidos</TableHead>
                    <TableHead className="text-right">Faturamento</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dailyData.filter(d => d.orders > 0).map(d => (
                    <TableRow key={d.date}>
                      <TableCell>{format(new Date(d.date), "dd/MM/yyyy (EEEE)", { locale: ptBR })}</TableCell>
                      <TableCell className="text-right">{d.orders}</TableCell>
                      <TableCell className="text-right font-semibold">
                        R$ {d.revenue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
