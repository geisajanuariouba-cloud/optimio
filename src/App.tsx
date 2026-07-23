import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { lazy, Suspense } from "react";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import { TenantProvider } from "@/hooks/useTenant";
import AppLayout from "./components/app/AppLayout";
import { ErrorBoundary } from "./components/app/ErrorBoundary";

// Eager (landing + auth flow — kept eager so first paint is fast)
import Landing from "./pages/Landing";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";

// Lazy — public chrome
const Onboarding = lazy(() => import("./pages/Onboarding"));
const SuperAdmin = lazy(() => import("./pages/SuperAdmin"));
const LegalPublic = lazy(() => import("./pages/Legal"));
const InviteAccept = lazy(() => import("./pages/InviteAccept"));

// Lazy — app pages (split per route → only loads when accessed)
const Dashboard = lazy(() => import("./pages/app/Dashboard"));
const Appointments = lazy(() => import("./pages/app/Appointments"));
const Clients = lazy(() => import("./pages/app/Clients"));
const ClientDetail = lazy(() => import("./pages/app/ClientDetail"));
const Packages = lazy(() => import("./pages/app/Packages"));
const Anamnesis = lazy(() => import("./pages/app/Anamnesis"));
const Services = lazy(() => import("./pages/app/Services"));
const Products = lazy(() => import("./pages/app/Products"));
const Financial = lazy(() => import("./pages/app/Financial"));
const Marketing = lazy(() => import("./pages/app/Marketing"));
const Integrations = lazy(() => import("./pages/app/Integrations"));
const Trash = lazy(() => import("./pages/app/Trash"));
const SettingsPage = lazy(() => import("./pages/app/Settings"));
const Debts = lazy(() => import("./pages/app/Debts"));
const Support = lazy(() => import("./pages/app/Support"));
const Categories = lazy(() => import("./pages/app/Categories"));
const PaymentMethods = lazy(() => import("./pages/app/PaymentMethods"));
const CashDrawer = lazy(() => import("./pages/app/CashDrawer"));
const Suppliers = lazy(() => import("./pages/app/Suppliers"));
const SupplierDetail = lazy(() => import("./pages/app/SupplierDetail"));
const Deliveries = lazy(() => import("./pages/app/Deliveries"));
const Combos = lazy(() => import("./pages/app/Combos"));
const Projects = lazy(() => import("./pages/app/Projects"));
const Quotes = lazy(() => import("./pages/app/Quotes"));
const Automations = lazy(() => import("./pages/app/Automations"));
const Assemblers = lazy(() => import("./pages/app/Assemblers"));
const Sales = lazy(() => import("./pages/app/Sales"));
const StartHere = lazy(() => import("./pages/app/StartHere"));
const Team = lazy(() => import("./pages/app/Team"));
const HR = lazy(() => import("./pages/app/HR"));
const Tasks = lazy(() => import("./pages/app/Tasks"));
const Stock = lazy(() => import("./pages/app/Stock"));
const ImportReview = lazy(() => import("./pages/app/ImportReview"));
const Funnel = lazy(() => import("./pages/app/Funnel"));
const Collections = lazy(() => import("./pages/app/Collections"));
const Operations = lazy(() => import("./pages/app/Operations"));
const Alerts = lazy(() => import("./pages/app/Alerts"));
const Knowledge = lazy(() => import("./pages/app/Knowledge"));
const Audit = lazy(() => import("./pages/app/Audit"));
const Suggestions = lazy(() => import("./pages/app/Suggestions"));
const Production = lazy(() => import("./pages/app/Production"));
const CardMachines = lazy(() => import("./pages/app/CardMachines"));
const Marketplaces = lazy(() => import("./pages/app/Marketplaces"));
const SmartPurchases = lazy(() => import("./pages/app/SmartPurchases"));
const Campaigns = lazy(() => import("./pages/app/Campaigns"));
const Meetings = lazy(() => import("./pages/app/Meetings"));
const PlanUpgrade = lazy(() => import("./pages/app/PlanUpgrade"));
const Reports = lazy(() => import("./pages/app/Reports"));
const ProductIdeas = lazy(() => import("./pages/app/ProductIdeas"));
const LegalApp = lazy(() => import("./pages/app/Legal"));
const AdAccounts = lazy(() => import("./pages/app/AdAccounts"));
const AdCreatives = lazy(() => import("./pages/app/AdCreatives"));
const AdCash = lazy(() => import("./pages/app/AdCash"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, refetchOnWindowFocus: false, staleTime: 5 * 60_000, gcTime: 10 * 60_000 },
    mutations: { retry: 0 },
  },
});

const PageFallback = () => (
  <div className="min-h-[40vh] flex items-center justify-center">
    <div className="h-10 w-10 rounded-full border-2 border-primary border-t-transparent animate-spin" />
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <TenantProvider>
            <ErrorBoundary>
              <Suspense fallback={<PageFallback />}>
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
                    <Route path="hr" element={<HR />} />
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
                    <Route path="operations" element={<Operations />} />
                    <Route path="alerts" element={<Alerts />} />
                    <Route path="knowledge" element={<Knowledge />} />
                    <Route path="audit" element={<Audit />} />
                    <Route path="suggestions" element={<Suggestions />} />
                    <Route path="production" element={<Production />} />
                    <Route path="card-machines" element={<CardMachines />} />
                    <Route path="marketplaces" element={<Marketplaces />} />
                    <Route path="smart-purchases" element={<SmartPurchases />} />
                    <Route path="campaigns" element={<Campaigns />} />
                    <Route path="meetings" element={<Meetings />} />
                    <Route path="upgrade" element={<PlanUpgrade />} />
                    <Route path="reports" element={<Reports />} />
                    <Route path="product-ideas" element={<ProductIdeas />} />
                    <Route path="legal" element={<LegalApp />} />
                    <Route path="ad-accounts" element={<AdAccounts />} />
                    <Route path="ad-creatives" element={<AdCreatives />} />
                    <Route path="ad-cash" element={<AdCash />} />
                  </Route>
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
            </ErrorBoundary>
          </TenantProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
