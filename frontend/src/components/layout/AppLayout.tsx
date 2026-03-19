import { useState } from "react";
import { Outlet } from "react-router-dom";
import { Clock, XCircle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { AICopilotBubble } from "@/components/copilot/AICopilotBubble";

function ApprovalBanner() {
  const { profile } = useAuth();

  if (!profile || profile.approval_status === "approved") return null;

  if (profile.approval_status === "pending_approval") {
    return (
      <div className="mx-6 lg:mx-8 mt-6 px-4 py-3 rounded-xl bg-amber-50 border border-amber-200 flex items-center gap-3">
        <Clock className="w-5 h-5 text-amber-600 flex-shrink-0" />
        <p className="text-sm text-amber-800">
          Your account is under review. Some features are limited until
          approved.
        </p>
      </div>
    );
  }

  if (profile.approval_status === "rejected") {
    return (
      <div className="mx-6 lg:mx-8 mt-6 px-4 py-3 rounded-xl bg-red-50 border border-red-200 flex items-center gap-3">
        <XCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
        <p className="text-sm text-red-700">
          Your account was not approved
          {profile.rejection_reason
            ? `: ${profile.rejection_reason}`
            : "."}
          {" "}Contact support for assistance.
        </p>
      </div>
    );
  }

  return null;
}

export function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-brand-bg">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="lg:ml-[var(--sidebar-width)]">
        <Topbar onMenuClick={() => setSidebarOpen(true)} />
        <ApprovalBanner />
        <main className="p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
      <AICopilotBubble />
    </div>
  );
}
