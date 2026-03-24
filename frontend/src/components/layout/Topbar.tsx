import { useState, useRef, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Menu, Bell, LogOut, Settings, User, ChevronDown } from "lucide-react";
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
    <header className="h-[var(--topbar-height)] bg-white/80 backdrop-blur-md border-b border-brand-border/[0.12] flex items-center justify-between px-4 sm:px-6 sticky top-0 z-30">
      {/* Left section */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 rounded-xl hover:bg-brand-bg text-brand-muted transition-colors cursor-pointer"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div>
          <h2 className="text-base font-semibold text-brand-text leading-tight">{pageTitle}</h2>
        </div>
      </div>

      {/* Right section */}
      <div className="flex items-center gap-1">
        {/* Notifications */}
        <button
          onClick={() => navigate("/notifications")}
          className="relative p-2.5 rounded-xl hover:bg-brand-bg text-brand-muted hover:text-brand-text transition-colors cursor-pointer"
        >
          <Bell className="w-[18px] h-[18px]" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 min-w-[18px] h-[18px] flex items-center justify-center px-1 bg-brand-accent text-white text-[10px] font-bold rounded-full ring-2 ring-white">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </button>

        {/* User avatar + dropdown */}
        {profile && (
          <div className="relative ml-1" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center gap-2 p-1.5 pr-2 rounded-xl hover:bg-brand-bg transition-all cursor-pointer"
            >
              <Avatar
                src={profile.avatar_url || undefined}
                name={profile.full_name}
                size="sm"
              />
              <ChevronDown className={`w-3.5 h-3.5 text-brand-muted transition-transform duration-200 hidden sm:block ${dropdownOpen ? "rotate-180" : ""}`} />
            </button>

            {dropdownOpen && (
              <div className="absolute right-0 mt-2 w-60 bg-white rounded-2xl shadow-modal border border-brand-border/[0.12] py-1 z-50 animate-fade-in-scale">
                <div className="px-4 py-3 border-b border-brand-border/[0.08]">
                  <p className="text-sm font-semibold text-brand-text truncate">{profile.full_name}</p>
                  <p className="text-xs text-brand-muted truncate mt-0.5">{profile.email}</p>
                </div>
                <div className="py-1">
                  <button
                    onClick={() => { setDropdownOpen(false); navigate("/settings"); }}
                    className="flex items-center gap-2.5 w-full px-4 py-2 text-[13px] text-brand-muted hover:text-brand-text hover:bg-brand-bg transition-colors cursor-pointer"
                  >
                    <User className="w-4 h-4" />
                    Profile
                  </button>
                  <button
                    onClick={() => { setDropdownOpen(false); navigate("/settings"); }}
                    className="flex items-center gap-2.5 w-full px-4 py-2 text-[13px] text-brand-muted hover:text-brand-text hover:bg-brand-bg transition-colors cursor-pointer"
                  >
                    <Settings className="w-4 h-4" />
                    Settings
                  </button>
                </div>
                <div className="border-t border-brand-border/[0.08] pt-1">
                  <button
                    onClick={handleSignOut}
                    className="flex items-center gap-2.5 w-full px-4 py-2 text-[13px] text-red-500 hover:text-red-600 hover:bg-red-50/50 transition-colors cursor-pointer"
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
