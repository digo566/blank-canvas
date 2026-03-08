import { useSubscriptionContext } from "@/contexts/SubscriptionContext";

// Re-export from context for backward compatibility
export function useSubscription() {
  return useSubscriptionContext();
}
