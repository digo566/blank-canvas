import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useAdminCheck() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSeller, setIsSeller] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const check = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setIsAdmin(false); setIsSeller(false); setLoading(false); return; }
      const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", user.id);
      const roleList = (roles || []).map(r => r.role);
      setIsAdmin(roleList.includes("admin"));
      setIsSeller(roleList.includes("seller"));
      setLoading(false);
    };
    check();
  }, []);

  return { isAdmin, isSeller, loading };
}
