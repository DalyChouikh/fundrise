import { useState, useEffect } from "react";
import {
  Bell,
  DollarSign,
  Target,
  Building2,
  MessageSquare,
  Heart,
  CheckCircle,
  ClipboardList,
  CheckCheck,
  UserCheck,
  UserX,
} from "lucide-react";
import { api } from "@/lib/api";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import type { Notification, NotificationType } from "@/types";

const typeConfig: Record<
  NotificationType,
  { icon: typeof Bell; color: string; bg: string }
> = {
  investment_received: { icon: DollarSign, color: "text-emerald-600", bg: "bg-emerald-50" },
  investment_confirmed: { icon: CheckCircle, color: "text-emerald-600", bg: "bg-emerald-50" },
  campaign_update: { icon: Target, color: "text-brand-blue", bg: "bg-blue-50" },
  campaign_approved: { icon: CheckCircle, color: "text-emerald-600", bg: "bg-emerald-50" },
  campaign_rejected: { icon: Target, color: "text-red-500", bg: "bg-red-50" },
  milestone_completed: { icon: CheckCircle, color: "text-violet-600", bg: "bg-violet-50" },
  startup_approved: { icon: Building2, color: "text-emerald-600", bg: "bg-emerald-50" },
  new_message: { icon: MessageSquare, color: "text-brand-blue", bg: "bg-blue-50" },
  new_follower: { icon: Heart, color: "text-rose-500", bg: "bg-rose-50" },
  task_assigned: { icon: ClipboardList, color: "text-brand-accent", bg: "bg-orange-50" },
  task_comment: { icon: MessageSquare, color: "text-brand-accent", bg: "bg-orange-50" },
  user_approved: { icon: UserCheck, color: "text-emerald-600", bg: "bg-emerald-50" },
  user_rejected: { icon: UserX, color: "text-red-500", bg: "bg-red-50" },
};

export function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const data = await api.get<Notification[]>("/notifications/");
        setNotifications(data);
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    };
    fetchNotifications();
  }, []);

  const handleMarkRead = async (id: number) => {
    try {
      await api.post(`/notifications/${id}/read/`, {});
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
    } catch {
      // ignore
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.post("/notifications/read-all/", {});
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    } catch {
      // ignore
    }
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  if (loading) return <LoadingSpinner fullscreen />;

  return (
    <div className="space-y-6 max-w-2xl animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-brand-text">Notifications</h1>
          <p className="text-brand-muted mt-1 text-sm">
            {unreadCount > 0
              ? `You have ${unreadCount} unread notification${unreadCount > 1 ? "s" : ""}.`
              : "You're all caught up."}
          </p>
        </div>
        {unreadCount > 0 && (
          <Button variant="secondary" size="sm" onClick={handleMarkAllRead}>
            <CheckCheck className="w-4 h-4" />
            Mark all read
          </Button>
        )}
      </div>

      {notifications.length === 0 ? (
        <Card>
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-2xl bg-brand-bg flex items-center justify-center mb-4">
              <Bell className="w-8 h-8 text-brand-muted" />
            </div>
            <h2 className="text-base font-semibold text-brand-text mb-1">
              No notifications yet
            </h2>
            <p className="text-sm text-brand-muted max-w-sm">
              You'll receive notifications when there's activity related to your
              account.
            </p>
          </div>
        </Card>
      ) : (
        <div className="space-y-2">
          {notifications.map((notif) => {
            const config = typeConfig[notif.notification_type] || {
              icon: Bell,
              color: "text-brand-muted",
              bg: "bg-brand-bg",
            };
            const Icon = config.icon;
            return (
              <button
                key={notif.id}
                onClick={() => !notif.is_read && handleMarkRead(notif.id)}
                className={`w-full text-left transition-all rounded-2xl ${
                  notif.is_read ? "" : "cursor-pointer"
                }`}
              >
                <div
                  className={`bg-white rounded-2xl border shadow-card p-4 transition-all ${
                    notif.is_read
                      ? "opacity-50 border-brand-border/[0.08]"
                      : "border-l-[3px] border-l-brand-accent border-brand-border/[0.12] hover:shadow-card-hover"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`p-2 rounded-xl ${config.bg} flex-shrink-0`}
                    >
                      <Icon className={`w-4 h-4 ${config.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p
                          className={`text-sm ${
                            notif.is_read
                              ? "text-brand-muted"
                              : "font-semibold text-brand-text"
                          }`}
                        >
                          {notif.title}
                        </p>
                        {!notif.is_read && (
                          <div className="w-2 h-2 rounded-full bg-brand-accent flex-shrink-0 mt-1.5" />
                        )}
                      </div>
                      <p className="text-xs text-brand-muted mt-0.5 leading-relaxed">
                        {notif.message}
                      </p>
                      <p className="text-[11px] text-brand-muted/60 mt-1.5 tabular-nums">
                        {new Date(notif.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
