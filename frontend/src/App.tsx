import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
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
import { PlaceholderPage } from "@/pages/PlaceholderPage";
import { NotFoundPage } from "@/pages/NotFoundPage";

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />

          {/* Protected routes with layout */}
          <Route element={<ProtectedRoute />}>
            <Route
              path="/onboarding/role"
              element={<RoleSelectionPage />}
            />
            <Route element={<AppLayout />}>
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/startups" element={<StartupsPage />} />
              <Route path="/startups/:id" element={<StartupDetailPage />} />
              <Route path="/campaigns" element={<CampaignsPage />} />
              <Route path="/campaigns/:id" element={<CampaignDetailPage />} />
              <Route
                path="/investments"
                element={
                  <PlaceholderPage
                    title="Investments"
                    description="Track your investment portfolio and returns."
                  />
                }
              />
              <Route
                path="/kanban"
                element={
                  <PlaceholderPage
                    title="Kanban Board"
                    description="Manage startup tasks and track progress."
                  />
                }
              />
              <Route
                path="/kanban/:startupId"
                element={
                  <PlaceholderPage
                    title="Kanban Board"
                    description="Manage startup tasks and track progress."
                  />
                }
              />
              <Route
                path="/chat"
                element={
                  <PlaceholderPage
                    title="Chat"
                    description="Real-time messaging with team members and investors."
                  />
                }
              />
              <Route
                path="/notifications"
                element={
                  <PlaceholderPage
                    title="Notifications"
                    description="Stay updated on your campaigns, investments, and activity."
                  />
                }
              />
              <Route
                path="/settings"
                element={
                  <PlaceholderPage
                    title="Settings"
                    description="Manage your profile, preferences, and account settings."
                  />
                }
              />
            </Route>
          </Route>

          {/* Redirects */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />

          {/* 404 */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
