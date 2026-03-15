import { useState, useEffect } from "react";
import { Users, Search, X } from "lucide-react";
import { api } from "@/lib/api";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import type { UserProfile, UserRole } from "@/types";

const ROLE_OPTIONS: { value: UserRole; label: string }[] = [
  { value: "founder", label: "Founder" },
  { value: "team_member", label: "Team Member" },
  { value: "investor", label: "Investor" },
  { value: "admin", label: "Admin" },
];

export function UsersPage() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("");
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);

  const fetchUsers = async () => {
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.set("search", searchQuery);
      if (roleFilter) params.set("role", roleFilter);
      const query = params.toString();
      const data = await api.get<UserProfile[]>(
        `/users/${query ? `?${query}` : ""}`
      );
      setUsers(data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [roleFilter]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchUsers();
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleRoleUpdate = async (userId: string, newRole: UserRole) => {
    try {
      await api.patch(`/users/${userId}/`, { role: newRole });
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u))
      );
      setEditingUser(null);
    } catch {
      // ignore
    }
  };

  if (loading) return <LoadingSpinner fullscreen />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-brand-text">User Management</h1>
        <p className="text-brand-muted mt-1 text-sm">
          View and manage platform users.
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-brand-border/50 text-brand-muted text-sm flex-1 max-w-sm shadow-card focus-within:border-brand-blue/50 transition-colors">
          <Search className="w-4 h-4 flex-shrink-0" />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-transparent outline-none w-full text-brand-text placeholder:text-brand-muted"
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="px-4 py-2.5 rounded-xl bg-white border border-brand-border/50 text-brand-text text-sm shadow-card outline-none focus:border-brand-blue/50 transition-colors"
        >
          <option value="">All Roles</option>
          {ROLE_OPTIONS.map((role) => (
            <option key={role.value} value={role.value}>
              {role.label}
            </option>
          ))}
        </select>
      </div>

      {/* Users Table */}
      {users.length === 0 ? (
        <Card>
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-2xl bg-brand-bg flex items-center justify-center mb-5">
              <Users className="w-7 h-7 text-brand-muted" />
            </div>
            <h2 className="text-lg font-semibold text-brand-text mb-2">
              No users found
            </h2>
            <p className="text-sm text-brand-muted max-w-md">
              Try adjusting your search or filter criteria.
            </p>
          </div>
        </Card>
      ) : (
        <Card padding="none">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-brand-border/20">
                  <th className="text-left text-xs font-medium text-brand-muted uppercase tracking-wider px-6 py-3">
                    User
                  </th>
                  <th className="text-left text-xs font-medium text-brand-muted uppercase tracking-wider px-6 py-3">
                    Role
                  </th>
                  <th className="text-left text-xs font-medium text-brand-muted uppercase tracking-wider px-6 py-3">
                    Joined
                  </th>
                  <th className="text-right text-xs font-medium text-brand-muted uppercase tracking-wider px-6 py-3">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-border/10">
                {users.map((user) => (
                  <tr
                    key={user.id}
                    className="hover:bg-brand-bg/50 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <Avatar
                          src={user.avatar_url || undefined}
                          name={user.full_name}
                          size="sm"
                        />
                        <div>
                          <p className="text-sm font-medium text-brand-text">
                            {user.full_name}
                          </p>
                          <p className="text-xs text-brand-muted">
                            {user.email}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <Badge status={user.role} />
                    </td>
                    <td className="px-6 py-4 text-sm text-brand-muted">
                      {new Date(user.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditingUser(user)}
                      >
                        Edit Role
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Edit Role Modal */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setEditingUser(null)}
          />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm mx-4">
            <div className="flex items-center justify-between p-6 border-b border-brand-border/20">
              <h2 className="text-lg font-bold text-brand-text">Edit Role</h2>
              <button
                onClick={() => setEditingUser(null)}
                className="p-1.5 rounded-xl hover:bg-brand-bg text-brand-muted transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <Avatar
                  src={editingUser.avatar_url || undefined}
                  name={editingUser.full_name}
                  size="md"
                />
                <div>
                  <p className="text-sm font-medium text-brand-text">
                    {editingUser.full_name}
                  </p>
                  <p className="text-xs text-brand-muted">
                    {editingUser.email}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                {ROLE_OPTIONS.map((role) => (
                  <button
                    key={role.value}
                    onClick={() =>
                      handleRoleUpdate(editingUser.id, role.value)
                    }
                    className={`w-full text-left px-4 py-3 rounded-xl border transition-all ${
                      editingUser.role === role.value
                        ? "border-brand-accent bg-brand-accent/5 text-brand-accent"
                        : "border-brand-border/40 hover:border-brand-border hover:bg-brand-bg/50 text-brand-text"
                    }`}
                  >
                    <span className="text-sm font-medium">{role.label}</span>
                    {editingUser.role === role.value && (
                      <span className="text-xs ml-2 text-brand-accent">
                        (current)
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
