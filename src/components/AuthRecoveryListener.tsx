import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

/**
 * Listens for PASSWORD_RECOVERY auth events globally.
 * If Supabase redirects to "/" or any other page with recovery tokens,
 * this component catches it and navigates to /reset-password.
 */
const AuthRecoveryListener = () => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" && location.pathname !== "/reset-password") {
        navigate("/reset-password", { replace: true });
      }
    });

    // Also check URL hash on mount for recovery type (implicit flow fallback)
    const hash = window.location.hash;
    if (hash) {
      const hashParams = new URLSearchParams(hash.substring(1));
      if (hashParams.get("type") === "recovery" && location.pathname !== "/reset-password") {
        navigate("/reset-password", { replace: true });
      }
    }

    return () => subscription.unsubscribe();
  }, [navigate, location.pathname]);

  return null;
};

export default AuthRecoveryListener;
