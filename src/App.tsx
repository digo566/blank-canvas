import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";

// Eager load: landing, auth, and public store (critical paths)
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import PublicStore from "./pages/PublicStore";
import TrackOrder from "./pages/TrackOrder";
import ResetPassword from "./pages/ResetPassword";
import NotFound from "./pages/NotFound";
import AuthRecoveryListener from "./components/AuthRecoveryListener";

// Lazy load: dashboard pages (heavy deps like Plotly, Recharts)
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Products = lazy(() => import("./pages/Products"));
const Orders = lazy(() => import("./pages/Orders"));
const Customers = lazy(() => import("./pages/Customers"));
const AbandonedCarts = lazy(() => import("./pages/AbandonedCarts"));
const Analytics = lazy(() => import("./pages/Analytics"));
const Finance = lazy(() => import("./pages/Finance"));
const Settings = lazy(() => import("./pages/Settings"));
const Admin = lazy(() => import("./pages/Admin"));
const Subscription = lazy(() => import("./pages/Subscription"));

const queryClient = new QueryClient();

const PageLoader = () => (
  <div className="flex items-center justify-center min-h-screen bg-background">
    <div className="flex flex-col items-center gap-3">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      <p className="text-sm text-muted-foreground">Carregando...</p>
    </div>
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthRecoveryListener />
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/products" element={<Products />} />
            <Route path="/orders" element={<Orders />} />
            <Route path="/customers" element={<Customers />} />
            <Route path="/abandoned-carts" element={<AbandonedCarts />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/finance" element={<Finance />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/track" element={<TrackOrder />} />
            <Route path="/store/:restaurantId" element={<PublicStore />} />
            <Route path="/r/:restaurantId" element={<PublicStore />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/subscription" element={<Subscription />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;