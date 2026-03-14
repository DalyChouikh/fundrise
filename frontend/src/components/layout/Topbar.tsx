import { useLocation } from "react-router-dom";
import { Menu, Bell, Search } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar } from "@/components/ui/Avatar";

const pageTitles: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/startups": "Startups",
  "/campaigns": "Campaigns",
  "/investments": "Investments",
  "/kanban": "Kanban Board",
  "/chat": "Chat",
  "/notifications": "Notifications",
  "/settings": "Settings",
  "/users": "Users",
};

interface TopbarProps {
  onMenuClick: () => void;
}

export function Topbar({ onMenuClick }: TopbarProps) {
  const { profile } = useAuth();
  const location = useLocation();

  const matchedKey = Object.keys(pageTitles).find((key) =>
    location.pathname.startsWith(key)
  );
  const pageTitle = matchedKey ? pageTitles[matchedKey] : "Funderaise";

  return (
    <header className="h-[var(--topbar-height)] bg-white/80 backdrop-blur-sm border-b border-brand-border/30 flex items-center justify-between px-6 sticky top-0 z-30">
      {/* Left section */}
      <div className="flex items-center gap-4">
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 rounded-xl hover:bg-brand-bg text-brand-muted transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>
        <h2 className="text-lg font-semibold text-brand-text">{pageTitle}</h2>
      </div>

      {/* Right section */}
      <div className="flex items-center gap-2">
        {/* Search */}
        <div className="hidden md:flex items-center gap-2 px-3 py-2 rounded-xl bg-brand-bg border border-brand-border/50 text-brand-muted text-sm w-64 transition-colors focus-within:border-brand-blue/50">
          <Search className="w-4 h-4 flex-shrink-0" />
          <input
            type="text"
            placeholder="Search..."
            className="bg-transparent outline-none w-full text-brand-text placeholder:text-brand-muted"
          />
        </div>

        {/* Notifications */}
        <button className="relative p-2.5 rounded-xl hover:bg-brand-bg text-brand-muted hover:text-brand-text transition-colors">
          <Bell className="w-[18px] h-[18px]" />
          <span className="absolute top-2 right-2 w-2 h-2 bg-brand-accent rounded-full" />
        </button>

        {/* User avatar */}
        {profile && (
          <div className="ml-1">
            <Avatar
              src={profile.avatar_url || undefined}
              name={profile.full_name}
              size="sm"
            />
          </div>
        )}
      </div>
    </header>
  );
}
