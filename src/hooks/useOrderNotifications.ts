import { useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// Sound URL - using a web audio API beep
const playNotificationSound = () => {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    // Create oscillator for beep sound
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.value = 800; // Frequency in Hz
    oscillator.type = "sine";
    
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.5);
    
    // Play second beep
    setTimeout(() => {
      const oscillator2 = audioContext.createOscillator();
      const gainNode2 = audioContext.createGain();
      
      oscillator2.connect(gainNode2);
      gainNode2.connect(audioContext.destination);
      
      oscillator2.frequency.value = 1000;
      oscillator2.type = "sine";
      
      gainNode2.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode2.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
      
      oscillator2.start(audioContext.currentTime);
      oscillator2.stop(audioContext.currentTime + 0.5);
    }, 200);
  } catch (error) {
    console.error("Error playing notification sound:", error);
  }
};

interface OrderNotification {
  id: string;
  tracking_code: string;
  total_amount: number;
  created_at: string;
}

export const useOrderNotifications = (
  onNewOrder?: (order: OrderNotification) => void
) => {
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const userIdRef = useRef<string | null>(null);

  const showNotification = useCallback((order: OrderNotification) => {
    playNotificationSound();
    
    toast.success(
      `🔔 Novo Pedido #${order.tracking_code}`,
      {
        description: `Valor: R$ ${Number(order.total_amount).toFixed(2)}`,
        duration: 10000,
        action: {
          label: "Ver Pedidos",
          onClick: () => {
            window.location.href = "/orders";
          },
        },
      }
    );

    onNewOrder?.(order);
  }, [onNewOrder]);

  useEffect(() => {
    const setupChannel = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      userIdRef.current = user.id;

      // Subscribe to new orders for this restaurant
      channelRef.current = supabase
        .channel('new-orders')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'orders',
            filter: `restaurant_id=eq.${user.id}`,
          },
          (payload) => {
            console.log("New order received:", payload);
            const newOrder = payload.new as OrderNotification;
            showNotification(newOrder);
          }
        )
        .subscribe((status) => {
          console.log("Order notification channel status:", status);
        });
    };

    setupChannel();

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [showNotification]);

  return null;
};