import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
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
import { OnboardingWizard } from "./components/OnboardingWizard";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const AppContent = () => {
  return (
    <>
      <Routes>
        <Route path="/auth" element={<Auth />} />
        <Route path="/onboarding" element={<OnboardingWizard />} />
        <Route path="/*" element={
          <SidebarProvider>
            <div className="min-h-screen flex w-full bg-background relative">
              <AppSidebar />
              <main className="flex-1 overflow-auto relative z-10 w-full">
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
                  <Route path="/ai-observability" element={<AIObservability />} />
                  <Route path="/ai-recovery-insights" element={<AIRecoveryInsights />} />
                  <Route path="/settings" element={<Settings />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </main>
            </div>
          </SidebarProvider>
        } />
      </Routes>
    </>
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
