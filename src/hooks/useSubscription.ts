import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface Subscription {
  id: string;
  status: string;
  billing_type: string | null;
  value: number;
  next_due_date: string | null;
  asaas_subscription_id: string | null;
}

interface SubscriptionState {
  loading: boolean;
  hasActiveSubscription: boolean;
  subscription: Subscription | null;
  isOnTrial: boolean;
  trialDaysLeft: number;
  checkSubscription: () => Promise<void>;
}

export function useSubscription(): SubscriptionState {
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [hasActiveSubscription, setHasActiveSubscription] = useState(false);
  const [isOnTrial, setIsOnTrial] = useState(false);
  const [trialDaysLeft, setTrialDaysLeft] = useState(0);

  const checkSubscription = async () => {
    try {
      setLoading(true);
      
      // Check trial status from profile
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setHasActiveSubscription(false);
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("trial_ends_at")
        .eq("id", user.id)
        .maybeSingle();

      // Check subscription via edge function
      const { data, error } = await supabase.functions.invoke("asaas-subscription", {
        body: { action: "check-status" },
      });

      if (error) throw error;

      setSubscription(data?.subscription || null);
      const subActive = data?.status === "active";

      // Check trial
      if (profile?.trial_ends_at) {
        const trialEnd = new Date(profile.trial_ends_at);
        const now = new Date();
        const daysLeft = Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        
        if (daysLeft > 0 && !subActive) {
          setIsOnTrial(true);
          setTrialDaysLeft(daysLeft);
          setHasActiveSubscription(true); // Trial counts as active
          return;
        } else {
          setIsOnTrial(false);
          setTrialDaysLeft(0);
        }
      }

      setHasActiveSubscription(subActive);
    } catch (err) {
      console.error("Error checking subscription:", err);
      setHasActiveSubscription(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkSubscription();
  }, []);

  return { loading, hasActiveSubscription, subscription, isOnTrial, trialDaysLeft, checkSubscription };
}
