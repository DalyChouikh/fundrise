import { useState } from "react";
import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { AICopilotBubble } from "@/components/copilot/AICopilotBubble";

export function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-brand-bg">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="lg:ml-[var(--sidebar-width)]">
        <Topbar onMenuClick={() => setSidebarOpen(true)} />
        <main className="p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
      <AICopilotBubble />
    </div>
  );
}
