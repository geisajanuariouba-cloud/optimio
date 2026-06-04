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
import Integrations from "./pages/app/Integrations";
import Trash from "./pages/app/Trash";
import SettingsPage from "./pages/app/Settings";
import Debts from "./pages/app/Debts";
import Support from "./pages/app/Support";
import LegalPublic from "./pages/Legal";
import ClientDetail from "./pages/app/ClientDetail";
import Categories from "./pages/app/Categories";
import PaymentMethods from "./pages/app/PaymentMethods";
import CashDrawer from "./pages/app/CashDrawer";
import Suppliers from "./pages/app/Suppliers";
import SupplierDetail from "./pages/app/SupplierDetail";
import Deliveries from "./pages/app/Deliveries";
import Combos from "./pages/app/Combos";
import Projects from "./pages/app/Projects";
import Quotes from "./pages/app/Quotes";
import Automations from "./pages/app/Automations";
import Assemblers from "./pages/app/Assemblers";
import Sales from "./pages/app/Sales";
import StartHere from "./pages/app/StartHere";
import Team from "./pages/app/Team";
import InviteAccept from "./pages/InviteAccept";
import Tasks from "./pages/app/Tasks";
import Stock from "./pages/app/Stock";
import ImportReview from "./pages/app/ImportReview";
import Funnel from "./pages/app/Funnel";
import Collections from "./pages/app/Collections";

import Campaigns from "./pages/app/Campaigns";
import Meetings from "./pages/app/Meetings";
import PlanUpgrade from "./pages/app/PlanUpgrade";

import { ErrorBoundary } from "./components/app/ErrorBoundary";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 30_000,
    },
    mutations: { retry: 0 },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <TenantProvider>
            <ErrorBoundary>
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/onboarding" element={<Onboarding />} />
              <Route path="/admin" element={<SuperAdmin />} />
              <Route path="/termos" element={<LegalPublic />} />
              <Route path="/privacidade" element={<LegalPublic />} />
              <Route path="/reembolso" element={<LegalPublic />} />
              <Route path="/invite/:token" element={<InviteAccept />} />
              <Route path="/app" element={<AppLayout />}>
                <Route index element={<Dashboard />} />
                <Route path="start" element={<StartHere />} />
                <Route path="team" element={<Team />} />
                <Route path="appointments" element={<Appointments />} />
                <Route path="clients" element={<Clients />} />
                <Route path="clients/:id" element={<ClientDetail />} />
                <Route path="packages" element={<Packages />} />
                <Route path="categories" element={<Categories />} />
                <Route path="suppliers" element={<Suppliers />} />
                <Route path="suppliers/:id" element={<SupplierDetail />} />
                <Route path="payment-methods" element={<PaymentMethods />} />
                <Route path="cash-drawer" element={<CashDrawer />} />
                <Route path="deliveries" element={<Deliveries />} />
                <Route path="assemblers" element={<Assemblers />} />
                <Route path="anamnesis" element={<Anamnesis />} />
                <Route path="services" element={<Services />} />
                <Route path="products" element={<Products />} />
                <Route path="quotes" element={<Quotes />} />
                <Route path="sales" element={<Sales />} />
                <Route path="financial" element={<Financial />} />
                <Route path="debts" element={<Debts />} />
                <Route path="marketing" element={<Marketing />} />
                <Route path="combos" element={<Combos />} />
                <Route path="projects" element={<Projects />} />
                <Route path="automations" element={<Automations />} />
                <Route path="integrations" element={<Integrations />} />
                <Route path="support" element={<Support />} />
                <Route path="trash" element={<Trash />} />
                <Route path="settings" element={<SettingsPage />} />
                <Route path="tasks" element={<Tasks />} />
                <Route path="stock" element={<Stock />} />
                <Route path="import-review" element={<ImportReview />} />
                <Route path="funnel" element={<Funnel />} />
                <Route path="collections" element={<Collections />} />
                
                <Route path="campaigns" element={<Campaigns />} />
                <Route path="meetings" element={<Meetings />} />
                <Route path="upgrade" element={<PlanUpgrade />} />
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
            </ErrorBoundary>
          </TenantProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
