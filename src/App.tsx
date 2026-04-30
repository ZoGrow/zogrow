import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { ViewModeProvider } from "@/contexts/ViewModeContext";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import Dashboard from "@/pages/Dashboard";
import Clients from "@/pages/Clients";
import ClientDetail from "@/pages/ClientDetail";
import Settings from "@/pages/Settings";
import Leaderboards from "@/pages/Leaderboards";
import Users from "@/pages/Users";
import SalesDashboard from "@/pages/SalesDashboard";
import SalesEntry from "@/pages/SalesEntry";
import SalesMonthly from "@/pages/SalesMonthly";
import SalesDailyGrid from "@/pages/SalesDailyGrid";
import B2BAds from "@/pages/B2BAds";
import SMSOutreach from "@/pages/SMSOutreach";
import ISAPerformance from "@/pages/ISAPerformance";
import Auth from "@/pages/Auth";
import Integrations from "@/pages/Integrations";
import NotFound from "@/pages/NotFound";
import ResetPassword from "@/pages/ResetPassword";

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
}

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/auth" element={<Auth />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<Dashboard />} />
        <Route path="/clients" element={<Clients />} />
        <Route path="/clients/:id" element={<ClientDetail />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/leaderboards" element={<Leaderboards />} />
        <Route path="/isa-performance" element={<ISAPerformance />} />
        <Route path="/users" element={<Users />} />
        <Route path="/sales" element={<SalesDashboard />} />
        <Route path="/sales/entry" element={<SalesEntry />} />
        <Route path="/sales/monthly" element={<SalesMonthly />} />
        <Route path="/sales/daily-grid" element={<SalesDailyGrid />} />
        <Route path="/sales/b2b-ads" element={<B2BAds />} />
        <Route path="/sales/sms-outreach" element={<SMSOutreach />} />
        <Route path="/integrations" element={<Integrations />} />
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <ViewModeProvider>
        <AuthProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </AuthProvider>
      </ViewModeProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
