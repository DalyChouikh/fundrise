import { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft, Lock, MessageSquare, X, Send } from "lucide-react";
import { api } from "@/lib/api";
import { Avatar } from "@/components/ui/Avatar";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { useAuth } from "@/contexts/AuthContext";
import type { KanbanColumn, KanbanTask, TaskComment } from "@/types";

export function InvestorKanbanPage() {
  const { startupId } = useParams<{ startupId: string }>();
  const navigate = useNavigate();
  const { state } = useLocation();
  const { profile } = useAuth();
  const startupName: string = (state as { startupName?: string })?.startupName ?? "Startup";

  const [columns, setColumns] = useState<KanbanColumn[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState<KanbanTask | null>(null);
  const [comments, setComments] = useState<TaskComment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    if (!startupId) return;
    api.get<KanbanColumn[]>(`/kanban/${startupId}/board/`)
      .then(setColumns)
      .catch(() => navigate("/investments", { replace: true }))
      .finally(() => setLoading(false));
  }, [startupId, navigate]);

  const handleTaskClick = async (task: KanbanTask) => {
    setSelectedTask(task);
    setComments([]);
    setCommentsLoading(true);
    try {
      const data = await api.get<TaskComment[]>(`/kanban/tasks/${task.id}/comments/`);
      setComments(data);
    } catch {
      // ignore
    } finally {
      setCommentsLoading(false);
    }
  };

  const handlePostComment = async () => {
    if (!selectedTask || !newComment.trim()) return;
    setPosting(true);
    try {
      const comment = await api.post<TaskComment>(`/kanban/tasks/${selectedTask.id}/comments/`, {
        content: newComment,
      });
      setComments((prev) => [...prev, comment]);
      setNewComment("");
    } catch {
      // ignore
    } finally {
      setPosting(false);
    }
  };

  if (loading) return <LoadingSpinner fullscreen />;

  return (
    <div className="flex flex-col h-full -m-6 lg:-m-8">
      {/* Header */}
      <div className="flex items-center gap-4 px-6 py-4 border-b border-brand-border/[0.12] bg-white flex-shrink-0">
        <button
          onClick={() => navigate("/investments")}
          className="p-2 rounded-xl hover:bg-brand-bg transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4 text-brand-muted" />
        </button>
        <div className="flex-1">
          <h1 className="text-base font-bold text-brand-text">{startupName}</h1>
          <p className="text-xs text-brand-muted">Kanban Board</p>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-brand-bg border border-brand-border/[0.12]">
          <Lock className="w-3.5 h-3.5 text-brand-muted" />
          <span className="text-xs font-medium text-brand-muted">Read-only</span>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Board */}
        <div className="flex-1 overflow-x-auto p-6">
          {columns.length === 0 ? (
            <div className="flex items-center justify-center h-full text-brand-muted text-sm">
              No columns yet.
            </div>
          ) : (
            <div className="flex gap-4 h-full">
              {columns.map((col) => (
                <div key={col.id} className="flex-shrink-0 w-72">
                  <div className="bg-brand-bg/60 rounded-xl p-3 flex flex-col gap-2">
                    <div className="flex items-center justify-between px-1 mb-1">
                      <h3 className="text-sm font-semibold text-brand-text">{col.name}</h3>
                      <span className="text-xs text-brand-muted bg-white border border-brand-border/[0.12] rounded-lg px-2 py-0.5">
                        {col.tasks.length}
                      </span>
                    </div>
                    {col.tasks.map((task) => (
                      <button
                        key={task.id}
                        onClick={() => handleTaskClick(task)}
                        className={`w-full text-left bg-white rounded-xl border transition-all duration-150 p-3 shadow-sm hover:shadow-md cursor-pointer ${
                          selectedTask?.id === task.id
                            ? "border-brand-accent/40 ring-1 ring-brand-accent/20"
                            : "border-brand-border/[0.12]"
                        }`}
                      >
                        <p className="text-sm font-medium text-brand-text leading-snug">{task.title}</p>
                        {task.description && (
                          <p className="text-xs text-brand-muted mt-1 line-clamp-2 leading-relaxed">
                            {task.description}
                          </p>
                        )}
                        <div className="flex items-center gap-2 mt-2">
                          {task.assignee_detail && (
                            <Avatar
                              src={task.assignee_detail.avatar_url || undefined}
                              name={task.assignee_detail.full_name}
                              size="sm"
                            />
                          )}
                          {task.comments_count > 0 && (
                            <span className="ml-auto flex items-center gap-1 text-xs text-brand-muted">
                              <MessageSquare className="w-3 h-3" />
                              {task.comments_count}
                            </span>
                          )}
                        </div>
                      </button>
                    ))}
                    {col.tasks.length === 0 && (
                      <div className="text-center py-6 text-xs text-brand-muted/50">
                        No tasks
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Task detail side panel */}
        {selectedTask && (
          <div className="w-96 flex-shrink-0 border-l border-brand-border/[0.12] bg-white flex flex-col">
            {/* Panel header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-brand-border/[0.12]">
              <h3 className="text-sm font-bold text-brand-text leading-snug flex-1 pr-3">
                {selectedTask.title}
              </h3>
              <button
                onClick={() => setSelectedTask(null)}
                className="p-1.5 rounded-lg hover:bg-brand-bg transition-colors cursor-pointer flex-shrink-0"
              >
                <X className="w-4 h-4 text-brand-muted" />
              </button>
            </div>

            {/* Panel content */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              {selectedTask.description && (
                <div>
                  <p className="text-[11px] text-brand-muted font-medium uppercase tracking-wider mb-1.5">
                    Description
                  </p>
                  <p className="text-sm text-brand-text leading-relaxed">
                    {selectedTask.description}
                  </p>
                </div>
              )}

              {selectedTask.assignee_detail && (
                <div>
                  <p className="text-[11px] text-brand-muted font-medium uppercase tracking-wider mb-1.5">
                    Assignee
                  </p>
                  <div className="flex items-center gap-2">
                    <Avatar
                      src={selectedTask.assignee_detail.avatar_url || undefined}
                      name={selectedTask.assignee_detail.full_name}
                      size="sm"
                    />
                    <span className="text-sm text-brand-text">
                      {selectedTask.assignee_detail.full_name}
                    </span>
                  </div>
                </div>
              )}

              {/* Comments */}
              <div>
                <p className="text-[11px] text-brand-muted font-medium uppercase tracking-wider mb-3">
                  Comments
                </p>
                {commentsLoading ? (
                  <div className="flex justify-center py-4">
                    <div className="w-5 h-5 border-2 border-brand-accent border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : comments.length === 0 ? (
                  <p className="text-xs text-brand-muted/60 text-center py-4">
                    No comments yet. Be the first!
                  </p>
                ) : (
                  <div className="space-y-3">
                    {comments.map((c) => (
                      <div key={c.id} className="flex gap-2.5">
                        <Avatar
                          src={c.author_avatar || undefined}
                          name={c.author_name}
                          size="sm"
                        />
                        <div className="flex-1 bg-brand-bg/40 rounded-xl p-2.5">
                          <div className="flex items-baseline gap-2">
                            <p className="text-xs font-semibold text-brand-text">{c.author_name}</p>
                            <p className="text-[10px] text-brand-muted">
                              {new Date(c.created_at).toLocaleDateString()}
                            </p>
                          </div>
                          <p className="text-xs text-brand-text mt-0.5 leading-relaxed">{c.content}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Comment input */}
            <div className="p-4 border-t border-brand-border/[0.12]">
              <div className="flex gap-2.5">
                <Avatar
                  src={profile?.avatar_url || undefined}
                  name={profile?.full_name ?? ""}
                  size="sm"
                />
                <div className="flex-1">
                  <textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handlePostComment();
                      }
                    }}
                    placeholder="Leave a comment..."
                    rows={2}
                    className="w-full resize-none text-sm border border-brand-border/[0.2] rounded-xl px-3 py-2 focus:outline-none focus:border-brand-accent transition-colors bg-brand-bg/30"
                  />
                  <button
                    onClick={handlePostComment}
                    disabled={posting || !newComment.trim()}
                    className="mt-1.5 flex items-center justify-center gap-2 w-full py-2 rounded-xl bg-brand-accent text-white text-sm font-medium disabled:opacity-50 hover:bg-brand-accent/90 transition-colors cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                    {posting ? "Posting..." : "Post Comment"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
