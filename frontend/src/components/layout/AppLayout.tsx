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
      <div className="mx-4 sm:mx-6 lg:mx-10 mt-5 px-4 py-3.5 rounded-2xl bg-amber-50/80 border border-amber-200/60 flex items-start gap-3 animate-fade-in">
        <div className="p-1.5 rounded-lg bg-amber-100 mt-0.5">
          <Clock className="w-4 h-4 text-amber-600" />
        </div>
        <div>
          <p className="text-sm font-medium text-amber-900">Account under review</p>
          <p className="text-[13px] text-amber-700/80 mt-0.5">
            Some features are limited until your account is approved.
          </p>
        </div>
      </div>
    );
  }

  if (profile.approval_status === "rejected") {
    return (
      <div className="mx-4 sm:mx-6 lg:mx-10 mt-5 px-4 py-3.5 rounded-2xl bg-red-50/80 border border-red-200/60 flex items-start gap-3 animate-fade-in">
        <div className="p-1.5 rounded-lg bg-red-100 mt-0.5">
          <XCircle className="w-4 h-4 text-red-500" />
        </div>
        <div>
          <p className="text-sm font-medium text-red-900">Account not approved</p>
          <p className="text-[13px] text-red-700/80 mt-0.5">
            {profile.rejection_reason
              ? profile.rejection_reason
              : "Contact support for assistance."}
          </p>
        </div>
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
      <div className="lg:ml-[var(--sidebar-width)] min-h-screen flex flex-col">
        <Topbar onMenuClick={() => setSidebarOpen(true)} />
        <ApprovalBanner />
        <main className="flex-1 p-4 sm:p-6 lg:p-8 xl:p-10">
          <Outlet />
        </main>
      </div>
      <AICopilotBubble />
    </div>
  );
}
