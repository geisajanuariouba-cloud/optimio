import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import { TenantProvider } from "@/hooks/useTenant";
import Landing from "./pages/Landing";
import Auth from "./pages/Auth";
import Onboarding from "./pages/Onboarding";
import SuperAdmin from "./pages/SuperAdmin";
import PublicSite from "./pages/PublicSite";
import NotFound from "./pages/NotFound";
import AppLayout from "./components/app/AppLayout";
import Dashboard from "./pages/app/Dashboard";
import Appointments from "./pages/app/Appointments";
import Clients from "./pages/app/Clients";
import Packages from "./pages/app/Packages";
import Anamnesis from "./pages/app/Anamnesis";
import Services from "./pages/app/Services";
import Products from "./pages/app/Products";
import Financial from "./pages/app/Financial";
import Marketing from "./pages/app/Marketing";
import SiteBuilder from "./pages/app/SiteBuilder";
import Integrations from "./pages/app/Integrations";
import Trash from "./pages/app/Trash";
import SettingsPage from "./pages/app/Settings";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <TenantProvider>
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/onboarding" element={<Onboarding />} />
              <Route path="/admin" element={<SuperAdmin />} />
              <Route path="/s/:slug" element={<PublicSite />} />
              <Route path="/app" element={<AppLayout />}>
                <Route index element={<Dashboard />} />
                <Route path="appointments" element={<Appointments />} />
                <Route path="clients" element={<Clients />} />
                <Route path="packages" element={<Packages />} />
                <Route path="anamnesis" element={<Anamnesis />} />
                <Route path="services" element={<Services />} />
                <Route path="products" element={<Products />} />
                <Route path="financial" element={<Financial />} />
                <Route path="marketing" element={<Marketing />} />
                <Route path="site" element={<SiteBuilder />} />
                <Route path="integrations" element={<Integrations />} />
                <Route path="trash" element={<Trash />} />
                <Route path="settings" element={<SettingsPage />} />
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
          </TenantProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
