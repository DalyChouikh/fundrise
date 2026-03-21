import { useState, useRef, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Menu, Bell, LogOut, Settings, User } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
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
  const { profile, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const matchedKey = Object.keys(pageTitles).find((key) =>
    location.pathname.startsWith(key)
  );
  const pageTitle = matchedKey ? pageTitles[matchedKey] : "Funderaise";

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const fetchUnread = async () => {
      try {
        const data = await api.get<{ count: number }>("/notifications/unread-count/");
        setUnreadCount(data.count);
      } catch {
        // ignore
      }
    };
    fetchUnread();
    const interval = setInterval(fetchUnread, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleSignOut = async () => {
    setDropdownOpen(false);
    await signOut();
    navigate("/login");
  };

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
        {/* Notifications */}
        <button
          onClick={() => navigate("/notifications")}
          className="relative p-2.5 rounded-xl hover:bg-brand-bg text-brand-muted hover:text-brand-text transition-colors"
        >
          <Bell className="w-[18px] h-[18px]" />
          {unreadCount > 0 && (
            <span className="absolute top-1.5 right-1.5 min-w-[16px] h-4 flex items-center justify-center px-1 bg-brand-accent text-white text-[10px] font-bold rounded-full">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </button>

        {/* User avatar + dropdown */}
        {profile && (
          <div className="relative ml-1" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="rounded-xl hover:ring-2 hover:ring-brand-border/50 transition-all"
            >
              <Avatar
                src={profile.avatar_url || undefined}
                name={profile.full_name}
                size="sm"
              />
            </button>

            {dropdownOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-card-hover border border-brand-border/30 py-1.5 z-50">
                <div className="px-4 py-2.5 border-b border-brand-border/20">
                  <p className="text-sm font-semibold text-brand-text truncate">{profile.full_name}</p>
                  <p className="text-xs text-brand-muted truncate">{profile.email}</p>
                </div>
                <button
                  onClick={() => { setDropdownOpen(false); navigate("/settings"); }}
                  className="flex items-center gap-2.5 w-full px-4 py-2 text-sm text-brand-muted hover:text-brand-text hover:bg-brand-bg transition-colors"
                >
                  <Settings className="w-4 h-4" />
                  Settings
                </button>
                <button
                  onClick={() => { setDropdownOpen(false); navigate("/settings"); }}
                  className="flex items-center gap-2.5 w-full px-4 py-2 text-sm text-brand-muted hover:text-brand-text hover:bg-brand-bg transition-colors"
                >
                  <User className="w-4 h-4" />
                  Profile
                </button>
                <div className="border-t border-brand-border/20 mt-1 pt-1">
                  <button
                    onClick={handleSignOut}
                    className="flex items-center gap-2.5 w-full px-4 py-2 text-sm text-red-500 hover:text-red-600 hover:bg-red-50/50 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign out
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
