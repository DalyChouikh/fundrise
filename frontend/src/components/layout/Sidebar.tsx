import { NavLink, useLocation } from "react-router-dom";
import { LogOut, X } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar } from "@/components/ui/Avatar";
import { Logo } from "@/components/ui/Logo";
import { DynamicIcon } from "@/components/ui/DynamicIcon";
import type { NavItem } from "@/types";

const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", path: "/dashboard", icon: "LayoutDashboard" },
  {
    label: "My Startups",
    path: "/startups",
    icon: "Building2",
    roles: ["founder", "team_member"],
  },
  {
    label: "Browse Startups",
    path: "/startups",
    icon: "Search",
    roles: ["investor"],
  },
  {
    label: "Manage Startups",
    path: "/startups",
    icon: "Building2",
    roles: ["admin"],
  },
  {
    label: "Campaigns",
    path: "/campaigns",
    icon: "Target",
    roles: ["founder", "team_member"],
  },
  {
    label: "Browse Campaigns",
    path: "/campaigns",
    icon: "TrendingUp",
    roles: ["investor"],
  },
  {
    label: "Manage Campaigns",
    path: "/campaigns",
    icon: "Target",
    roles: ["admin"],
  },
  {
    label: "My Investments",
    path: "/investments",
    icon: "Wallet",
    roles: ["investor"],
  },
  {
    label: "Users",
    path: "/users",
    icon: "Users",
    roles: ["admin"],
  },
  {
    label: "Kanban",
    path: "/kanban",
    icon: "Columns3",
    roles: ["founder", "team_member"],
  },
  { label: "Chat", path: "/chat", icon: "MessageSquare" },
  { label: "Fundy AI", path: "/ai", icon: "Sparkles" },
  { label: "Notifications", path: "/notifications", icon: "Bell" },
  { label: "Settings", path: "/settings", icon: "Settings" },
];

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

export function Sidebar({ open, onClose }: SidebarProps) {
  const { profile, signOut } = useAuth();
  const location = useLocation();

  const filteredItems = NAV_ITEMS.filter(
    (item) => !item.roles || (profile && item.roles.includes(profile.role))
  );

  const isActive = (path: string) => location.pathname.startsWith(path);

  return (
    <>
      {/* Mobile backdrop */}
      {open && (
        <div
          className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40 lg:hidden transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 z-50 h-full w-[var(--sidebar-width)] bg-white border-r border-brand-border/[0.15] flex flex-col transition-transform duration-300 ease-out lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="h-[var(--topbar-height)] flex items-center justify-between px-6 border-b border-brand-border/[0.12]">
          <Logo size="sm" />
          <button
            onClick={onClose}
            className="lg:hidden p-1.5 rounded-lg hover:bg-brand-bg text-brand-muted transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-3 px-3">
          <ul className="space-y-0.5">
            {filteredItems.map((item) => {
              const active = isActive(item.path);
              return (
                <li key={item.label}>
                  <NavLink
                    to={item.path}
                    onClick={onClose}
                    className={`group flex items-center gap-3 px-3 py-2 rounded-xl text-[13px] font-medium transition-all duration-200 ${
                      active
                        ? "bg-brand-accent/[0.08] text-brand-accent"
                        : "text-brand-muted hover:text-brand-text hover:bg-black/[0.02]"
                    }`}
                  >
                    <div
                      className={`flex items-center justify-center w-8 h-8 rounded-lg transition-colors ${
                        active
                          ? "bg-brand-accent/[0.12]"
                          : "bg-transparent group-hover:bg-brand-bg"
                      }`}
                    >
                      <DynamicIcon
                        name={item.icon}
                        className={`w-[18px] h-[18px] flex-shrink-0 transition-colors ${
                          active
                            ? "text-brand-accent"
                            : "text-brand-muted group-hover:text-brand-text"
                        }`}
                      />
                    </div>
                    {item.label}
                  </NavLink>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* User section */}
        {profile && (
          <div className="border-t border-brand-border/[0.12] p-3">
            <div className="flex items-center gap-3 p-2 rounded-xl hover:bg-brand-bg/60 transition-colors mb-1">
              <Avatar
                src={profile.avatar_url || undefined}
                name={profile.full_name}
                size="sm"
              />
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-semibold text-brand-text truncate">
                  {profile.full_name}
                </p>
                <p className="text-[11px] text-brand-muted truncate">
                  {profile.email}
                </p>
              </div>
            </div>
            <button
              onClick={signOut}
              className="flex items-center gap-2.5 w-full px-3 py-2 rounded-xl text-[13px] text-brand-muted hover:text-red-600 hover:bg-red-50/50 transition-all duration-200 cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              Sign out
            </button>
          </div>
        )}
      </aside>
    </>
  );
}
