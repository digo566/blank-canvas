import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./AuthContext";

interface Subscription {
  id: string;
  status: string;
  billing_type: string | null;
  value: number;
  next_due_date: string | null;
  asaas_subscription_id: string | null;
}

interface SubscriptionContextType {
  loading: boolean;
  hasActiveSubscription: boolean;
  subscription: Subscription | null;
  isOnTrial: boolean;
  trialDaysLeft: number;
  checkSubscription: () => Promise<void>;
}

const SubscriptionContext = createContext<SubscriptionContextType>({
  loading: true,
  hasActiveSubscription: false,
  subscription: null,
  isOnTrial: false,
  trialDaysLeft: 0,
  checkSubscription: async () => {},
});

export const useSubscriptionContext = () => useContext(SubscriptionContext);

export const SubscriptionProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [hasActiveSubscription, setHasActiveSubscription] = useState(false);
  const [isOnTrial, setIsOnTrial] = useState(false);
  const [trialDaysLeft, setTrialDaysLeft] = useState(0);
  const [checked, setChecked] = useState(false);
  const [checkedOnce, setCheckedOnce] = useState(false);

  const checkSubscription = useCallback(async () => {
    if (!user) {
      setHasActiveSubscription(false);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      const [profileRes, subRes] = await Promise.all([
        supabase.from("profiles").select("trial_ends_at").eq("id", user.id).maybeSingle(),
        supabase.functions.invoke("asaas-subscription", { body: { action: "check-status" } }),
      ]);

      if (subRes.error) throw subRes.error;

      setSubscription(subRes.data?.subscription || null);
      const subActive = subRes.data?.status === "active";

      if (profileRes.data?.trial_ends_at) {
        const trialEnd = new Date(profileRes.data.trial_ends_at);
        const daysLeft = Math.ceil((trialEnd.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        if (daysLeft > 0 && !subActive) {
          setIsOnTrial(true);
          setTrialDaysLeft(daysLeft);
          setHasActiveSubscription(true);
          return;
        }
        setIsOnTrial(false);
        setTrialDaysLeft(0);
      }
      setHasActiveSubscription(subActive);
    } catch (err) {
      console.error("Error checking subscription:", err);
      setHasActiveSubscription(false);
    } finally {
      setLoading(false);
      setChecked(true);
    }
  }, [user]);

  useEffect(() => {
    if (user && !checked) {
      checkSubscription();
    } else if (!user) {
      setLoading(false);
    }
  }, [user, checked, checkSubscription]);

  return (
    <SubscriptionContext.Provider value={{ loading, hasActiveSubscription, subscription, isOnTrial, trialDaysLeft, checkSubscription }}>
      {children}
    </SubscriptionContext.Provider>
  );
};
