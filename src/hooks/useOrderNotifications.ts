import { useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const playNotificationSound = () => {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    oscillator.connect(gainNode); gainNode.connect(audioContext.destination);
    oscillator.frequency.value = 800; oscillator.type = "sine";
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
    oscillator.start(audioContext.currentTime); oscillator.stop(audioContext.currentTime + 0.5);
    setTimeout(() => {
      const o2 = audioContext.createOscillator(); const g2 = audioContext.createGain();
      o2.connect(g2); g2.connect(audioContext.destination);
      o2.frequency.value = 1000; o2.type = "sine";
      g2.gain.setValueAtTime(0.3, audioContext.currentTime);
      g2.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
      o2.start(audioContext.currentTime); o2.stop(audioContext.currentTime + 0.5);
    }, 200);
  } catch (error) { console.error("Error playing notification sound:", error); }
};

interface OrderNotification { id: string; tracking_code: string; total_amount: number; created_at: string; }

export const useOrderNotifications = (onNewOrder?: (order: OrderNotification) => void) => {
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const showNotification = useCallback((order: OrderNotification) => {
    playNotificationSound();
    toast.success(`🔔 Novo Pedido #${order.tracking_code}`, {
      description: `Valor: R$ ${Number(order.total_amount).toFixed(2)}`, duration: 10000,
      action: { label: "Ver Pedidos", onClick: () => { window.location.href = "/orders"; } },
    });
    onNewOrder?.(order);
  }, [onNewOrder]);

  useEffect(() => {
    const setupChannel = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      channelRef.current = supabase.channel('new-orders')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders', filter: `restaurant_id=eq.${user.id}` },
          (payload) => { showNotification(payload.new as OrderNotification); })
        .subscribe();
    };
    setupChannel();
    return () => { if (channelRef.current) supabase.removeChannel(channelRef.current); };
  }, [showNotification]);

  return null;
};
