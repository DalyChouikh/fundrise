import { useState, useEffect } from "react";
import { Users, Search, X, FileText } from "lucide-react";
import { api } from "@/lib/api";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Select } from "@/components/ui/Select";
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
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [rejectingUser, setRejectingUser] = useState<UserProfile | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const fetchUsers = async () => {
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.set("search", searchQuery);
      if (roleFilter) params.set("role", roleFilter);
      if (statusFilter) params.set("approval_status", statusFilter);
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
  }, [roleFilter, statusFilter]);

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

  const handleApproveUser = async (userId: string) => {
    try {
      await api.post(`/users/${userId}/approve/`, {});
      setUsers((prev) =>
        prev.map((u) =>
          u.id === userId
            ? { ...u, approval_status: "approved" as const, rejection_reason: "" }
            : u
        )
      );
    } catch {
      // ignore
    }
  };

  const handleRejectUser = async () => {
    if (!rejectingUser || !rejectReason.trim()) return;
    try {
      await api.post(`/users/${rejectingUser.id}/reject/`, {
        reason: rejectReason,
      });
      setUsers((prev) =>
        prev.map((u) =>
          u.id === rejectingUser.id
            ? { ...u, approval_status: "rejected" as const, rejection_reason: rejectReason }
            : u
        )
      );
      setRejectingUser(null);
      setRejectReason("");
    } catch {
      // ignore
    }
  };

  if (loading) return <LoadingSpinner fullscreen />;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-brand-text">User Management</h1>
        <p className="text-brand-muted mt-1 text-sm">
          View and manage platform users.
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-brand-border/30 text-brand-muted text-sm flex-1 max-w-sm shadow-sm focus-within:border-brand-blue/40 focus-within:ring-2 focus-within:ring-brand-blue/10 transition-all">
          <Search className="w-4 h-4 flex-shrink-0" />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-transparent outline-none w-full text-brand-text placeholder:text-brand-muted/60"
          />
        </div>
        <Select
          options={[{ value: "", label: "All Roles" }, ...ROLE_OPTIONS]}
          value={roleFilter}
          onChange={(val) => setRoleFilter(val)}
          placeholder="All Roles"
          className="w-44"
        />
        <Select
          options={[
            { value: "", label: "All Status" },
            { value: "pending_approval", label: "Pending" },
            { value: "approved", label: "Approved" },
            { value: "rejected", label: "Rejected" },
          ]}
          value={statusFilter}
          onChange={(val) => setStatusFilter(val)}
          placeholder="All Status"
          className="w-44"
        />
      </div>

      {/* Users Table */}
      {users.length === 0 ? (
        <Card>
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-2xl bg-brand-bg flex items-center justify-center mb-4">
              <Users className="w-7 h-7 text-brand-muted" />
            </div>
            <h2 className="text-base font-semibold text-brand-text mb-1">
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
                <tr className="border-b border-brand-border/[0.1]">
                  <th className="text-left text-[11px] font-semibold text-brand-muted uppercase tracking-wider px-6 py-3.5">
                    User
                  </th>
                  <th className="text-left text-[11px] font-semibold text-brand-muted uppercase tracking-wider px-6 py-3.5">
                    Role
                  </th>
                  <th className="text-left text-[11px] font-semibold text-brand-muted uppercase tracking-wider px-6 py-3.5">
                    Status
                  </th>
                  <th className="text-left text-[11px] font-semibold text-brand-muted uppercase tracking-wider px-6 py-3.5">
                    Joined
                  </th>
                  <th className="text-right text-[11px] font-semibold text-brand-muted uppercase tracking-wider px-6 py-3.5">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-border/[0.06]">
                {users.map((user) => (
                  <tr
                    key={user.id}
                    className="hover:bg-brand-bg/40 transition-colors"
                  >
                    <td className="px-6 py-3.5">
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
                          <p className="text-[11px] text-brand-muted">
                            {user.email}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-3.5">
                      <Badge status={user.role} />
                    </td>
                    <td className="px-6 py-3.5">
                      <Badge status={user.approval_status} />
                    </td>
                    <td className="px-6 py-3.5 text-sm text-brand-muted tabular-nums">
                      {new Date(user.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {user.approval_status === "pending_approval" && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleApproveUser(user.id)}
                              className="!text-emerald-600 hover:!bg-emerald-50"
                            >
                              Approve
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setRejectingUser(user)}
                              className="!text-red-500 hover:!bg-red-50"
                            >
                              Reject
                            </Button>
                          </>
                        )}
                        {user.approval_status === "rejected" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleApproveUser(user.id)}
                            className="!text-emerald-600 hover:!bg-emerald-50"
                          >
                            Re-Approve
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingUser(user)}
                        >
                          Edit Role
                        </Button>
                      </div>
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
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setEditingUser(null)}
          />
          <div className="relative bg-white rounded-2xl shadow-modal w-full max-w-sm mx-4 animate-fade-in-scale">
            <div className="flex items-center justify-between p-5 border-b border-brand-border/[0.1]">
              <h2 className="text-base font-bold text-brand-text">Edit Role</h2>
              <button
                onClick={() => setEditingUser(null)}
                className="p-1.5 rounded-xl hover:bg-brand-bg text-brand-muted transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5">
              <div className="flex items-center gap-3 mb-5">
                <Avatar
                  src={editingUser.avatar_url || undefined}
                  name={editingUser.full_name}
                  size="md"
                />
                <div>
                  <p className="text-sm font-semibold text-brand-text">
                    {editingUser.full_name}
                  </p>
                  <p className="text-xs text-brand-muted">
                    {editingUser.email}
                  </p>
                </div>
              </div>

              <div className="space-y-1.5">
                {ROLE_OPTIONS.map((role) => (
                  <button
                    key={role.value}
                    onClick={() =>
                      handleRoleUpdate(editingUser.id, role.value)
                    }
                    className={`w-full text-left px-4 py-3 rounded-xl border transition-all cursor-pointer ${
                      editingUser.role === role.value
                        ? "border-brand-accent bg-brand-accent/[0.04] text-brand-accent"
                        : "border-brand-border/20 hover:border-brand-border/40 hover:bg-brand-bg/40 text-brand-text"
                    }`}
                  >
                    <span className="text-sm font-medium">{role.label}</span>
                    {editingUser.role === role.value && (
                      <span className="text-xs ml-2 text-brand-accent font-medium">
                        (current)
                      </span>
                    )}
                  </button>
                ))}
              </div>

              {(editingUser.identity_document_url || editingUser.company_document_url) && (
                <div className="mt-4 pt-4 border-t border-brand-border/20">
                  <h4 className="text-sm font-semibold text-brand-text mb-3">Verification Documents</h4>
                  <div className="space-y-2">
                    {editingUser.identity_document_url && (
                      <div className="flex items-center justify-between py-2 px-3 rounded-xl bg-brand-bg border border-brand-border/30">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-brand-accent" />
                          <span className="text-sm text-brand-text">Identity Document</span>
                        </div>
                        <a
                          href={editingUser.identity_document_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-brand-accent hover:underline"
                        >
                          View
                        </a>
                      </div>
                    )}
                    {editingUser.company_document_url && (
                      <div className="flex items-center justify-between py-2 px-3 rounded-xl bg-brand-bg border border-brand-border/30">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-brand-accent" />
                          <span className="text-sm text-brand-text">Company Document</span>
                        </div>
                        <a
                          href={editingUser.company_document_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-brand-accent hover:underline"
                        >
                          View
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Reject User Modal */}
      {rejectingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => {
              setRejectingUser(null);
              setRejectReason("");
            }}
          />
          <div className="relative bg-white rounded-2xl shadow-modal w-full max-w-sm mx-4 animate-fade-in-scale">
            <div className="flex items-center justify-between p-5 border-b border-brand-border/[0.1]">
              <h2 className="text-base font-bold text-brand-text">Reject User</h2>
              <button
                onClick={() => {
                  setRejectingUser(null);
                  setRejectReason("");
                }}
                className="p-1.5 rounded-xl hover:bg-brand-bg text-brand-muted transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5">
              <div className="flex items-center gap-3 mb-4">
                <Avatar
                  src={rejectingUser.avatar_url || undefined}
                  name={rejectingUser.full_name}
                  size="md"
                />
                <div>
                  <p className="text-sm font-semibold text-brand-text">
                    {rejectingUser.full_name}
                  </p>
                  <p className="text-xs text-brand-muted">
                    {rejectingUser.email}
                  </p>
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-[13px] font-medium text-brand-text mb-1.5">
                  Reason for rejection
                </label>
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Provide a reason..."
                  rows={3}
                  className="w-full px-4 py-2.5 rounded-xl bg-white border border-brand-border/40 text-brand-text placeholder:text-brand-muted/60 text-sm outline-none focus:border-brand-blue/40 focus:ring-2 focus:ring-brand-blue/10 transition-all resize-none shadow-sm"
                />
              </div>

              <Button
                onClick={handleRejectUser}
                disabled={!rejectReason.trim()}
                variant="danger"
                className="w-full"
              >
                Reject User
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
