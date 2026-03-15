import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Building2, Columns3 } from "lucide-react";
import { api } from "@/lib/api";
import { Card } from "@/components/ui/Card";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import type { Startup } from "@/types";

export function KanbanStartupSelector() {
  const navigate = useNavigate();
  const [startups, setStartups] = useState<Startup[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStartups = async () => {
      try {
        const data = await api.get<Startup[]>("/startups/");
        const active = data.filter((s) => s.status === "active");
        setStartups(active);
        // If only one startup, redirect directly
        if (active.length === 1) {
          navigate(`/kanban/${active[0].id}`, { replace: true });
        }
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    };
    fetchStartups();
  }, [navigate]);

  if (loading) return <LoadingSpinner fullscreen />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-brand-text">Kanban Board</h1>
        <p className="text-brand-muted mt-1 text-sm">
          Select a startup to view its task board.
        </p>
      </div>

      {startups.length === 0 ? (
        <Card>
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-2xl bg-brand-bg flex items-center justify-center mb-5">
              <Columns3 className="w-7 h-7 text-brand-muted" />
            </div>
            <h2 className="text-lg font-semibold text-brand-text mb-2">
              No startups available
            </h2>
            <p className="text-sm text-brand-muted max-w-md">
              You need to be a member of an active startup to use the Kanban board.
            </p>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {startups.map((startup) => (
            <button
              key={startup.id}
              onClick={() => navigate(`/kanban/${startup.id}`)}
              className="text-left"
            >
              <Card hover className="h-full">
                <div className="flex items-center gap-3">
                  {startup.logo_url ? (
                    <img
                      src={startup.logo_url}
                      alt={startup.name}
                      className="w-10 h-10 rounded-xl object-cover"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-xl bg-brand-accent/10 flex items-center justify-center">
                      <Building2 className="w-5 h-5 text-brand-accent" />
                    </div>
                  )}
                  <div>
                    <h3 className="font-semibold text-brand-text text-sm">
                      {startup.name}
                    </h3>
                    <p className="text-xs text-brand-muted">{startup.industry}</p>
                  </div>
                </div>
              </Card>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
