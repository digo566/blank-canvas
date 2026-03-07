import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Alert { id: string; title: string; message: string; severity: string; is_read: boolean; created_at: string; }

export function AlertsNotification() {
  const [alerts, setAlerts] = useState<Alert[]>([]); const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    fetchAlerts();
    const channel = supabase.channel("analytics_alerts").on("postgres_changes", { event: "INSERT", schema: "public", table: "analytics_alerts" }, (payload) => {
      const a = payload.new as Alert; setAlerts(prev => [a, ...prev]); setUnreadCount(prev => prev + 1);
      toast.warning(a.title, { description: a.message });
    }).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const fetchAlerts = async () => {
    const { data: { user } } = await supabase.auth.getUser(); if (!user) return;
    const { data } = await supabase.from("analytics_alerts").select("*").eq("restaurant_id", user.id).eq("is_resolved", false).order("created_at", { ascending: false }).limit(10);
    setAlerts(data || []); setUnreadCount(data?.filter(a => !a.is_read).length || 0);
  };

  const markAsRead = async (id: string) => {
    await supabase.from("analytics_alerts").update({ is_read: true }).eq("id", id);
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, is_read: true } : a)); setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const getColor = (s: string) => (s === "crítica" || s === "alta") ? "destructive" as const : s === "média" ? "default" as const : "secondary" as const;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild><Button variant="outline" size="icon" className="relative"><Bell className="h-5 w-5" />{unreadCount > 0 && <Badge variant="destructive" className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 text-xs">{unreadCount}</Badge>}</Button></DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[400px]">
        <DropdownMenuLabel className="flex items-center justify-between"><span>Alertas</span>{unreadCount > 0 && <Badge variant="secondary">{unreadCount} novos</Badge>}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {alerts.length === 0 ? <div className="p-4 text-center text-sm text-muted-foreground">Nenhum alerta</div> :
          <div className="max-h-[400px] overflow-y-auto">{alerts.map(a => (
            <DropdownMenuItem key={a.id} className="flex flex-col items-start gap-2 p-4 cursor-pointer" onClick={() => !a.is_read && markAsRead(a.id)}>
              <div className="flex items-center justify-between w-full"><span className="font-medium text-sm">{a.title}</span><Badge variant={getColor(a.severity)} className="text-xs">{a.severity}</Badge></div>
              <p className="text-xs text-muted-foreground">{a.message}</p><span className="text-xs text-muted-foreground">{new Date(a.created_at).toLocaleString("pt-BR")}</span>
            </DropdownMenuItem>
          ))}</div>}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
