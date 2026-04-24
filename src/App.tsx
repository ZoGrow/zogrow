import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { ViewModeProvider } from "@/contexts/ViewModeContext";
import { AuthProvider } from "@/hooks/useAuth";
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
import ISAPerformance from "@/pages/ISAPerformance";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/auth" element={<Navigate to="/" replace />} />
      <Route element={<AppLayout />}>
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
