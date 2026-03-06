import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Alert {
  id: string;
  title: string;
  message: string;
  severity: string;
  is_read: boolean;
  created_at: string;
}

export function AlertsNotification() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    fetchAlerts();
    
    // Subscribe to real-time alerts
    const channel = supabase
      .channel("analytics_alerts")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "analytics_alerts",
        },
        (payload) => {
          const newAlert = payload.new as Alert;
          setAlerts((prev) => [newAlert, ...prev]);
          setUnreadCount((prev) => prev + 1);
          toast.warning(newAlert.title, {
            description: newAlert.message,
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchAlerts = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("analytics_alerts")
      .select("*")
      .eq("restaurant_id", user.id)
      .eq("is_resolved", false)
      .order("created_at", { ascending: false })
      .limit(10);

    if (error) {
      console.error("Erro ao buscar alertas:", error);
      return;
    }

    setAlerts(data || []);
    setUnreadCount(data?.filter((a) => !a.is_read).length || 0);
  };

  const markAsRead = async (alertId: string) => {
    const { error } = await supabase
      .from("analytics_alerts")
      .update({ is_read: true })
      .eq("id", alertId);

    if (error) {
      console.error("Erro ao marcar alerta como lido:", error);
      return;
    }

    setAlerts((prev) =>
      prev.map((a) => (a.id === alertId ? { ...a, is_read: true } : a))
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "crítica": return "destructive";
      case "alta": return "destructive";
      case "média": return "default";
      default: return "secondary";
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[400px]">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Alertas</span>
          {unreadCount > 0 && (
            <Badge variant="secondary">{unreadCount} novos</Badge>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {alerts.length === 0 ? (
          <div className="p-4 text-center text-sm text-muted-foreground">
            Nenhum alerta no momento
          </div>
        ) : (
          <div className="max-h-[400px] overflow-y-auto">
            {alerts.map((alert) => (
              <DropdownMenuItem
                key={alert.id}
                className="flex flex-col items-start gap-2 p-4 cursor-pointer"
                onClick={() => !alert.is_read && markAsRead(alert.id)}
              >
                <div className="flex items-center justify-between w-full">
                  <span className="font-medium text-sm">{alert.title}</span>
                  <Badge variant={getSeverityColor(alert.severity)} className="text-xs">
                    {alert.severity}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">{alert.message}</p>
                <span className="text-xs text-muted-foreground">
                  {new Date(alert.created_at).toLocaleString("pt-BR")}
                </span>
                {!alert.is_read && (
                  <div className="h-2 w-2 rounded-full bg-primary absolute right-2 top-2" />
                )}
              </DropdownMenuItem>
            ))}
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
