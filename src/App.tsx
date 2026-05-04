import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import Landing from "./pages/Landing";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import AppLayout from "./components/app/AppLayout";
import Dashboard from "./pages/app/Dashboard";
import Appointments from "./pages/app/Appointments";
import Clients from "./pages/app/Clients";
import Packages from "./pages/app/Packages";
import Services from "./pages/app/Services";
import Products from "./pages/app/Products";
import Financial from "./pages/app/Financial";
import Marketing from "./pages/app/Marketing";
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
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/app" element={<AppLayout />}>
              <Route index element={<Dashboard />} />
              <Route path="appointments" element={<Appointments />} />
              <Route path="clients" element={<Clients />} />
              <Route path="packages" element={<Packages />} />
              <Route path="services" element={<Services />} />
              <Route path="products" element={<Products />} />
              <Route path="financial" element={<Financial />} />
              <Route path="marketing" element={<Marketing />} />
              <Route path="trash" element={<Trash />} />
              <Route path="settings" element={<SettingsPage />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
