import { ReactNode, useEffect, useMemo } from "react";
import { Navigate } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscriptionContext } from "@/contexts/SubscriptionContext";
import { Button } from "@/components/ui/button";
import { NavLink } from "@/components/NavLink";
import { 
  LayoutDashboard, Package, ShoppingBag, Users, LogOut, Menu,
  ShoppingCart, BarChart3, Settings, Crown, AlertTriangle, MessageSquarePlus
} from "lucide-react";
import grapeLogo from "@/assets/grape-logo.png";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useOrderNotifications } from "@/hooks/useOrderNotifications";
import { useAdminCheck } from "@/hooks/useAdminCheck";
import { supabase } from "@/integrations/supabase/client";

interface DashboardLayoutProps {
  children: ReactNode;
}

const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const { isAdmin } = useAdminCheck();
  const { loading: subLoading, hasActiveSubscription, isOnTrial, trialDaysLeft } = useSubscriptionContext();

  useOrderNotifications();

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [loading, user, navigate]);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      toast.success("Logout realizado com sucesso!");
      navigate("/auth");
    } catch (error) {
      toast.error("Erro ao fazer logout");
    }
  };

  const navItems = [
    { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
    { to: "/analytics", icon: BarChart3, label: "Analytics" },
    { to: "/products", icon: Package, label: "Produtos" },
    { to: "/orders", icon: ShoppingBag, label: "Pedidos" },
    { to: "/customers", icon: Users, label: "Clientes" },
    { to: "/abandoned-carts", icon: ShoppingCart, label: "Carrinhos" },
    { to: "/settings", icon: Settings, label: "Configurações" },
    { to: "/feedback", icon: MessageSquarePlus, label: "Opiniões" },
    ...(isAdmin ? [
      { to: "/admin", icon: Crown, label: "Admin Grape" }
    ] : []),
  ];

  const NavItems = () => (
    <>
      {navItems.map((item) => (
        <NavLink key={item.to} to={item.to}
          className="flex items-center gap-3 rounded-md px-3 py-2 text-muted-foreground transition-colors hover:text-foreground hover:bg-secondary"
          activeClassName="bg-primary/10 text-primary font-medium"
        >
          <item.icon className="h-4 w-4" />
          {item.label}
        </NavLink>
      ))}
    </>
  );

  if (loading || subLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent"></div>
      </div>
    );
  }

  if (!user) return null;

  if (!isAdmin && !hasActiveSubscription) {
    navigate("/subscription");
    return null;
  }

  return (
    <div className="flex min-h-screen w-full bg-background">
      <aside className="fixed inset-y-0 left-0 z-10 hidden w-56 flex-col border-r bg-card sm:flex">
        <div className="flex h-14 items-center border-b px-4 gap-3">
          <img src={grapeLogo} alt="grape" className="w-10 h-10 object-contain" />
          <span className="font-semibold text-foreground">grape</span>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1"><NavItems /></nav>
        <div className="border-t p-3">
          <Button onClick={handleLogout} variant="ghost" className="w-full justify-start gap-3 text-muted-foreground hover:text-destructive">
            <LogOut className="h-4 w-4" />Sair
          </Button>
        </div>
      </aside>

      <div className="flex flex-col flex-1 sm:pl-56">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-card px-4 sm:hidden">
          <Sheet>
            <SheetTrigger asChild><Button size="icon" variant="outline"><Menu className="h-5 w-5" /></Button></SheetTrigger>
            <SheetContent side="left" className="w-56 p-0">
              <div className="flex h-14 items-center border-b px-4 gap-3">
                <img src={grapeLogo} alt="grape" className="w-10 h-10 object-contain" />
                <span className="font-semibold">grape</span>
              </div>
              <nav className="flex-1 px-3 py-4 space-y-1"><NavItems /></nav>
              <div className="border-t p-3">
                <Button onClick={handleLogout} variant="ghost" className="w-full justify-start gap-3 text-muted-foreground hover:text-destructive">
                  <LogOut className="h-4 w-4" />Sair
                </Button>
              </div>
            </SheetContent>
          </Sheet>
          <span className="font-semibold">grape</span>
        </header>
        
        {isOnTrial && (
          <div className="mx-6 mt-4 p-3 rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800 flex items-center gap-3 justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
              <p className="text-sm text-amber-800 dark:text-amber-300">
                Período de teste grátis: <strong>{trialDaysLeft} {trialDaysLeft === 1 ? 'dia' : 'dias'} restantes</strong>
              </p>
            </div>
            <Button size="sm" variant="outline" className="shrink-0 border-amber-400 text-amber-700 hover:bg-amber-100 dark:text-amber-300 dark:hover:bg-amber-900" onClick={() => navigate("/subscription")}>
              Assinar agora
            </Button>
          </div>
        )}
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
};

export default DashboardLayout;
