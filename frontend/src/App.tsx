import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ToastProvider } from "@/components/ui/ToastProvider";
import { AppLayout } from "@/components/layout/AppLayout";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import { LoginPage } from "@/pages/auth/LoginPage";
import { SignupPage } from "@/pages/auth/SignupPage";
import { RoleSelectionPage } from "@/pages/auth/RoleSelectionPage";
import { DashboardPage } from "@/pages/dashboard/DashboardPage";
import { StartupsPage } from "@/pages/startups/StartupsPage";
import { StartupDetailPage } from "@/pages/startups/StartupDetailPage";
import { CampaignsPage } from "@/pages/campaigns/CampaignsPage";
import { CampaignDetailPage } from "@/pages/campaigns/CampaignDetailPage";
import { InvestmentsPage } from "@/pages/investments/InvestmentsPage";
import { UsersPage } from "@/pages/admin/UsersPage";
import { KanbanBoardPage } from "@/pages/kanban/KanbanBoardPage";
import { KanbanStartupSelector } from "@/pages/kanban/KanbanStartupSelector";
import { NotificationsPage } from "@/pages/notifications/NotificationsPage";
import { SettingsPage } from "@/pages/settings/SettingsPage";
import { ChatPage } from "@/pages/chat/ChatPage";
import { AICopilotPage } from "@/pages/ai/AICopilotPage";
import { InviteAcceptPage } from "@/pages/invites/InviteAcceptPage";
import { OnboardingPage } from "@/pages/onboarding/OnboardingPage";
import { NotFoundPage } from "@/pages/NotFoundPage";
import { BillingPage } from "@/pages/billing/BillingPage";
import { InvestorKanbanPage } from "@/pages/kanban/InvestorKanbanPage";

export default function App() {
  return (
    <ToastProvider>
      <BrowserRouter>
        <AuthProvider>
          <Routes>
          {/* Public routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/invite/:token" element={<InviteAcceptPage />} />

          {/* Protected routes with layout */}
          <Route element={<ProtectedRoute />}>
            <Route
              path="/onboarding/role"
              element={<RoleSelectionPage />}
            />
            <Route
              path="/onboarding/profile"
              element={<OnboardingPage />}
            />
            <Route element={<AppLayout />}>
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/startups" element={<StartupsPage />} />
              <Route path="/startups/:id" element={<StartupDetailPage />} />
              <Route path="/campaigns" element={<CampaignsPage />} />
              <Route path="/campaigns/:id" element={<CampaignDetailPage />} />
              <Route
                path="/investments"
                element={<InvestmentsPage />}
              />
              <Route path="/investments/board/:startupId" element={<InvestorKanbanPage />} />
              <Route path="/billing" element={<BillingPage />} />
              <Route path="/users" element={<UsersPage />} />
              <Route path="/kanban" element={<KanbanStartupSelector />} />
              <Route
                path="/kanban/:startupId"
                element={<KanbanBoardPage />}
              />
              <Route
                path="/chat"
                element={<ChatPage />}
              />
              <Route path="/ai" element={<AICopilotPage />} />
              <Route
                path="/notifications"
                element={<NotificationsPage />}
              />
              <Route path="/settings" element={<SettingsPage />} />
            </Route>
          </Route>

          {/* Redirects */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />

          {/* 404 */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
        </AuthProvider>
      </BrowserRouter>
    </ToastProvider>
  );
}
