import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { lazy, Suspense } from "react";
import Dashboard from "./pages/Dashboard";
import Auth from "./pages/Auth";
import CheckIn from "./pages/CheckIn";
import Journal from "./pages/Journal";
import Goals from "./pages/Goals";
import CopingTools from "./pages/CopingTools";
import Achievements from "./pages/Achievements";
import Progress from "./pages/Progress";
import Settings from "./pages/Settings";
import Community from "./pages/Community";
import WearableData from "./pages/WearableData";
import AIObservability from "./pages/AIObservability";
import AIRecoveryInsights from "./pages/AIRecoveryInsights";
import AIAgent from "./pages/AIAgent";
import Install from "./pages/Install";
import { OnboardingWizard } from "./components/OnboardingWizard";
import NotFound from "./pages/NotFound";
import { AdminLayout } from "./layouts/AdminLayout";

// Lazy load admin panel - only fetched for admin users
const AdminPanel = lazy(() => import("./pages/AdminPanel"));

const queryClient = new QueryClient();

const AppContent = () => {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/auth" element={<Auth />} />
      <Route path="/onboarding" element={<OnboardingWizard />} />
      <Route path="/install" element={<Install />} />

      {/* Admin routes - separate layout */}
      <Route path="/admin/*" element={
        <AdminLayout>
          <Suspense fallback={
            <div className="flex items-center justify-center h-screen">
              <div className="text-center space-y-2">
                <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-sm text-muted-foreground">Loading admin panel...</p>
              </div>
            </div>
          }>
            <Routes>
              <Route index element={<AdminPanel />} />
              {/* Future admin routes: /admin/ai-analytics, /admin/errors, etc. */}
              <Route path="*" element={<AdminPanel />} />
            </Routes>
          </Suspense>
        </AdminLayout>
      } />

      {/* User routes - AppSidebar layout */}
      <Route path="/*" element={
        <SidebarProvider>
          <div className="min-h-screen flex w-full bg-background relative">
            <AppSidebar />
            <main className="flex-1 overflow-auto relative z-10 w-full h-screen">
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/check-in" element={<CheckIn />} />
                <Route path="/journal" element={<Journal />} />
                <Route path="/goals" element={<Goals />} />
                <Route path="/coping" element={<CopingTools />} />
                <Route path="/progress" element={<Progress />} />
                <Route path="/achievements" element={<Achievements />} />
                <Route path="/community" element={<Community />} />
                <Route path="/wearables" element={<WearableData />} />
                <Route path="/ai-observability" element={
                  localStorage.getItem('devToolsUnlocked') === 'true' 
                    ? <AIObservability /> 
                    : <Navigate to="/settings" replace />
                } />
                <Route path="/ai-recovery-insights" element={<AIRecoveryInsights />} />
                <Route path="/ai-agent" element={<AIAgent />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </main>
          </div>
        </SidebarProvider>
      } />
    </Routes>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
