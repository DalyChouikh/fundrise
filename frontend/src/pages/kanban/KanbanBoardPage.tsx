import { useState, useEffect, type FormEvent } from "react";
import { useParams } from "react-router-dom";
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Plus,
  MoreHorizontal,
  MessageSquare,
  X,
  Trash2,
  GripVertical,
} from "lucide-react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import type {
  KanbanColumn,
  KanbanTask,
  TaskComment,
  StartupMember,
} from "@/types";

export function KanbanBoardPage() {
  const { startupId } = useParams<{ startupId: string }>();
  const [columns, setColumns] = useState<KanbanColumn[]>([]);
  const [members, setMembers] = useState<StartupMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTask, setActiveTask] = useState<KanbanTask | null>(null);
  const [addingColumn, setAddingColumn] = useState(false);
  const [newColumnName, setNewColumnName] = useState("");
  const [taskDetail, setTaskDetail] = useState<KanbanTask | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor)
  );

  const fetchBoard = async () => {
    if (!startupId) return;
    try {
      const [boardData, membersData] = await Promise.all([
        api.get<KanbanColumn[]>(`/kanban/${startupId}/board/`),
        api.get<StartupMember[]>(`/startups/${startupId}/members/`),
      ]);
      setColumns(boardData);
      setMembers(membersData);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBoard();
  }, [startupId]);

  const handleAddColumn = async (e: FormEvent) => {
    e.preventDefault();
    if (!newColumnName.trim() || !startupId) return;
    try {
      const col = await api.post<KanbanColumn>(
        `/kanban/${startupId}/columns/`,
        { name: newColumnName.trim() }
      );
      setColumns((prev) => [...prev, { ...col, tasks: [] }]);
      setNewColumnName("");
      setAddingColumn(false);
    } catch {
      // ignore
    }
  };

  const handleDeleteColumn = async (columnId: number) => {
    if (!startupId) return;
    try {
      await api.delete(`/kanban/${startupId}/columns/${columnId}/`);
      setColumns((prev) => prev.filter((c) => c.id !== columnId));
    } catch {
      // ignore
    }
  };

  const handleAddTask = async (columnId: number, title: string) => {
    if (!startupId) return;
    try {
      const task = await api.post<KanbanTask>(
        `/kanban/${startupId}/tasks/`,
        { column: columnId, title }
      );
      setColumns((prev) =>
        prev.map((col) =>
          col.id === columnId
            ? { ...col, tasks: [...col.tasks, { ...task, comments_count: 0 }] }
            : col
        )
      );
    } catch {
      // ignore
    }
  };

  const handleDeleteTask = async (taskId: number) => {
    if (!startupId) return;
    try {
      await api.delete(`/kanban/${startupId}/tasks/${taskId}/`);
      setColumns((prev) =>
        prev.map((col) => ({
          ...col,
          tasks: col.tasks.filter((t) => t.id !== taskId),
        }))
      );
      if (taskDetail?.id === taskId) setTaskDetail(null);
    } catch {
      // ignore
    }
  };

  const handleUpdateTask = async (
    taskId: number,
    data: Partial<KanbanTask>
  ) => {
    if (!startupId) return;
    try {
      const updated = await api.patch<KanbanTask>(
        `/kanban/${startupId}/tasks/${taskId}/`,
        data
      );
      setColumns((prev) =>
        prev.map((col) => ({
          ...col,
          tasks: col.tasks.map((t) => (t.id === taskId ? { ...t, ...updated } : t)),
        }))
      );
      if (taskDetail?.id === taskId) setTaskDetail({ ...taskDetail, ...updated });
    } catch {
      // ignore
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    const task = findTaskById(Number(event.active.id));
    if (task) setActiveTask(task);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveTask(null);
    const { active, over } = event;
    if (!over || !startupId) return;

    const taskId = Number(active.id);
    const overId = String(over.id);

    // Determine target column
    let targetColumnId: number;
    let targetOrder: number;

    if (overId.startsWith("column-")) {
      // Dropped on empty column
      targetColumnId = Number(overId.replace("column-", ""));
      targetOrder = 0;
    } else {
      // Dropped on another task
      const overTask = findTaskById(Number(overId));
      if (!overTask) return;
      targetColumnId = overTask.column;
      targetOrder = overTask.order;
    }

    const sourceTask = findTaskById(taskId);
    if (!sourceTask) return;
    if (
      sourceTask.column === targetColumnId &&
      sourceTask.order === targetOrder
    )
      return;

    // Optimistic update
    setColumns((prev) => {
      const updated = prev.map((col) => ({
        ...col,
        tasks: col.tasks.filter((t) => t.id !== taskId),
      }));
      return updated.map((col) => {
        if (col.id === targetColumnId) {
          const movedTask = {
            ...sourceTask,
            column: targetColumnId,
            order: targetOrder,
          };
          const tasks = [...col.tasks, movedTask].sort(
            (a, b) => a.order - b.order
          );
          return { ...col, tasks };
        }
        return col;
      });
    });

    try {
      await api.post(`/kanban/${startupId}/tasks/${taskId}/move/`, {
        column: targetColumnId,
        order: targetOrder,
      });
    } catch {
      fetchBoard(); // revert on failure
    }
  };

  const findTaskById = (id: number): KanbanTask | undefined => {
    for (const col of columns) {
      const task = col.tasks.find((t) => t.id === id);
      if (task) return task;
    }
    return undefined;
  };

  if (loading) return <LoadingSpinner fullscreen />;

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-brand-text">Kanban Board</h1>
          <p className="text-brand-muted mt-1 text-sm">
            Manage tasks and track progress.
          </p>
        </div>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-4 overflow-x-auto pb-4 flex-1 min-h-0">
          {columns.map((column) => (
            <BoardColumn
              key={column.id}
              column={column}
              onAddTask={handleAddTask}
              onDeleteColumn={handleDeleteColumn}
              onDeleteTask={handleDeleteTask}
              onOpenTask={setTaskDetail}
            />
          ))}

          {/* Add column */}
          <div className="flex-shrink-0 w-72">
            {addingColumn ? (
              <form
                onSubmit={handleAddColumn}
                className="bg-white rounded-xl shadow-card p-3"
              >
                <input
                  type="text"
                  autoFocus
                  value={newColumnName}
                  onChange={(e) => setNewColumnName(e.target.value)}
                  placeholder="Column name..."
                  className="w-full px-3 py-2 rounded-lg bg-brand-bg border border-brand-border/60 text-brand-text text-sm outline-none focus:border-brand-blue/50 mb-2"
                />
                <div className="flex items-center gap-2">
                  <Button size="sm" type="submit">
                    Add
                  </Button>
                  <button
                    type="button"
                    onClick={() => {
                      setAddingColumn(false);
                      setNewColumnName("");
                    }}
                    className="p-1 text-brand-muted hover:text-brand-text"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </form>
            ) : (
              <button
                onClick={() => setAddingColumn(true)}
                className="w-full flex items-center gap-2 px-4 py-3 rounded-xl border-2 border-dashed border-brand-border/40 text-brand-muted hover:border-brand-border hover:text-brand-text text-sm font-medium transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add Column
              </button>
            )}
          </div>
        </div>

        <DragOverlay>
          {activeTask ? <TaskCard task={activeTask} isDragging /> : null}
        </DragOverlay>
      </DndContext>

      {/* Task Detail Sidebar */}
      {taskDetail && (
        <TaskDetailSidebar
          task={taskDetail}
          members={members}
          startupId={startupId!}
          onClose={() => setTaskDetail(null)}
          onUpdate={handleUpdateTask}
          onDelete={handleDeleteTask}
        />
      )}
    </div>
  );
}

// Column component
function BoardColumn({
  column,
  onAddTask,
  onDeleteColumn,
  onDeleteTask,
  onOpenTask,
}: {
  column: KanbanColumn;
  onAddTask: (columnId: number, title: string) => void;
  onDeleteColumn: (columnId: number) => void;
  onDeleteTask: (taskId: number) => void;
  onOpenTask: (task: KanbanTask) => void;
}) {
  const [addingTask, setAddingTask] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [showMenu, setShowMenu] = useState(false);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;
    onAddTask(column.id, newTaskTitle.trim());
    setNewTaskTitle("");
    setAddingTask(false);
  };

  const taskIds = column.tasks.map((t) => t.id);

  return (
    <div className="flex-shrink-0 w-72 flex flex-col max-h-full">
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-brand-text">
            {column.name}
          </h3>
          <span className="text-xs text-brand-muted bg-brand-bg px-2 py-0.5 rounded-full">
            {column.tasks.length}
          </span>
        </div>
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-1 rounded-lg text-brand-muted hover:text-brand-text hover:bg-brand-bg transition-colors"
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>
          {showMenu && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowMenu(false)}
              />
              <div className="absolute right-0 top-7 z-20 bg-white rounded-xl shadow-lg border border-brand-border/30 py-1 w-36">
                <button
                  onClick={() => {
                    onDeleteColumn(column.id);
                    setShowMenu(false);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete column
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      <SortableContext
        items={taskIds}
        strategy={verticalListSortingStrategy}
        id={`column-${column.id}`}
      >
        <div
          className="flex-1 space-y-2 min-h-[60px] rounded-xl bg-brand-bg/50 p-2 overflow-y-auto"
          data-column-id={column.id}
        >
          {column.tasks.map((task) => (
            <SortableTaskCard
              key={task.id}
              task={task}
              onOpen={onOpenTask}
              onDelete={onDeleteTask}
            />
          ))}

          {/* Droppable zone for empty columns */}
          {column.tasks.length === 0 && (
            <DroppableZone columnId={column.id} />
          )}
        </div>
      </SortableContext>

      {/* Add task */}
      <div className="mt-2">
        {addingTask ? (
          <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-card p-3">
            <input
              type="text"
              autoFocus
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              placeholder="Task title..."
              className="w-full px-3 py-2 rounded-lg bg-brand-bg border border-brand-border/60 text-brand-text text-sm outline-none focus:border-brand-blue/50 mb-2"
            />
            <div className="flex items-center gap-2">
              <Button size="sm" type="submit">
                Add
              </Button>
              <button
                type="button"
                onClick={() => {
                  setAddingTask(false);
                  setNewTaskTitle("");
                }}
                className="p-1 text-brand-muted hover:text-brand-text"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </form>
        ) : (
          <button
            onClick={() => setAddingTask(true)}
            className="w-full flex items-center gap-1.5 px-3 py-2 rounded-xl text-brand-muted hover:text-brand-text hover:bg-white/80 text-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add task
          </button>
        )}
      </div>
    </div>
  );
}

// Droppable zone for empty columns
function DroppableZone({ columnId }: { columnId: number }) {
  const { setNodeRef, isOver } = useSortable({
    id: `column-${columnId}`,
  });

  return (
    <div
      ref={setNodeRef}
      className={`h-16 rounded-lg border-2 border-dashed transition-colors flex items-center justify-center ${
        isOver
          ? "border-brand-blue/50 bg-brand-blue/5"
          : "border-transparent"
      }`}
    >
      {isOver && (
        <p className="text-xs text-brand-blue">Drop here</p>
      )}
    </div>
  );
}

// Sortable task card wrapper
function SortableTaskCard({
  task,
  onOpen,
  onDelete,
}: {
  task: KanbanTask;
  onOpen: (task: KanbanTask) => void;
  onDelete: (taskId: number) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <TaskCard
        task={task}
        onOpen={onOpen}
        onDelete={onDelete}
        dragHandleProps={{ ...attributes, ...listeners }}
      />
    </div>
  );
}

// Task card
function TaskCard({
  task,
  isDragging,
  onOpen,
  onDelete,
  dragHandleProps,
}: {
  task: KanbanTask;
  isDragging?: boolean;
  onOpen?: (task: KanbanTask) => void;
  onDelete?: (taskId: number) => void;
  dragHandleProps?: Record<string, unknown>;
}) {
  return (
    <div
      className={`bg-white rounded-xl shadow-card p-3 cursor-pointer hover:shadow-card-hover transition-shadow ${
        isDragging ? "shadow-lg ring-2 ring-brand-blue/30" : ""
      }`}
      onClick={() => onOpen?.(task)}
    >
      <div className="flex items-start gap-2">
        <div
          {...dragHandleProps}
          className="mt-0.5 text-brand-muted/50 hover:text-brand-muted cursor-grab active:cursor-grabbing flex-shrink-0"
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-brand-text">{task.title}</p>
          {task.description && (
            <p className="text-xs text-brand-muted mt-1 line-clamp-2">
              {task.description}
            </p>
          )}
          <div className="flex items-center justify-between mt-2">
            <div className="flex items-center gap-2">
              {task.assignee_detail && (
                <Avatar
                  src={task.assignee_detail.avatar_url || undefined}
                  name={task.assignee_detail.full_name}
                  size="sm"
                  className="!w-5 !h-5 !text-[10px]"
                />
              )}
              {task.comments_count > 0 && (
                <span className="flex items-center gap-0.5 text-xs text-brand-muted">
                  <MessageSquare className="w-3 h-3" />
                  {task.comments_count}
                </span>
              )}
            </div>
            {onDelete && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(task.id);
                }}
                className="p-1 rounded text-brand-muted/50 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Task detail sidebar
function TaskDetailSidebar({
  task,
  members,
  startupId,
  onClose,
  onUpdate,
  onDelete,
}: {
  task: KanbanTask;
  members: StartupMember[];
  startupId: string;
  onClose: () => void;
  onUpdate: (taskId: number, data: Partial<KanbanTask>) => void;
  onDelete: (taskId: number) => void;
}) {
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description);
  const [comments, setComments] = useState<TaskComment[]>([]);
  const [newComment, setNewComment] = useState("");

  useEffect(() => {
    setTitle(task.title);
    setDescription(task.description);
    fetchComments();
  }, [task.id]);

  const fetchComments = async () => {
    try {
      const data = await api.get<TaskComment[]>(
        `/kanban/tasks/${task.id}/comments/`
      );
      setComments(data);
    } catch {
      // ignore
    }
  };

  const handleBlurTitle = () => {
    if (title !== task.title) onUpdate(task.id, { title });
  };

  const handleBlurDescription = () => {
    if (description !== task.description) onUpdate(task.id, { description });
  };

  const handleAssign = (userId: string | null) => {
    onUpdate(task.id, { assignee: userId } as Partial<KanbanTask>);
  };

  const handleAddComment = async (e: FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    try {
      const comment = await api.post<TaskComment>(
        `/kanban/tasks/${task.id}/comments/`,
        { content: newComment.trim() }
      );
      setComments((prev) => [...prev, comment]);
      setNewComment("");
    } catch {
      // ignore
    }
  };

  return (
    <>
      <div
        className="fixed inset-0 bg-black/30 z-40"
        onClick={onClose}
      />
      <div className="fixed right-0 top-0 h-full w-full max-w-md bg-white shadow-xl z-50 overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-brand-border/20">
          <h2 className="text-base font-semibold text-brand-text">
            Task Detail
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                onDelete(task.id);
                onClose();
              }}
              className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 transition-colors"
              title="Delete task"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-brand-muted hover:bg-brand-bg transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="p-4 space-y-5">
          {/* Title */}
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={handleBlurTitle}
            className="w-full text-lg font-semibold text-brand-text bg-transparent outline-none border-b border-transparent focus:border-brand-blue/30 pb-1 transition-colors"
          />

          {/* Description */}
          <div>
            <label className="text-xs font-medium text-brand-muted uppercase tracking-wider">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onBlur={handleBlurDescription}
              placeholder="Add a description..."
              rows={3}
              className="w-full mt-1.5 px-3 py-2 rounded-lg bg-brand-bg border border-brand-border/60 text-brand-text text-sm outline-none focus:border-brand-blue/50 resize-none"
            />
          </div>

          {/* Assignee */}
          <div>
            <label className="text-xs font-medium text-brand-muted uppercase tracking-wider">
              Assignee
            </label>
            <select
              value={task.assignee || ""}
              onChange={(e) =>
                handleAssign(e.target.value || null)
              }
              className="w-full mt-1.5 px-3 py-2 rounded-lg bg-brand-bg border border-brand-border/60 text-brand-text text-sm outline-none focus:border-brand-blue/50"
            >
              <option value="">Unassigned</option>
              {members.map((m) => (
                <option key={m.user.id} value={m.user.id}>
                  {m.user.full_name}
                </option>
              ))}
            </select>
          </div>

          {/* Comments */}
          <div>
            <label className="text-xs font-medium text-brand-muted uppercase tracking-wider">
              Comments ({comments.length})
            </label>
            <div className="mt-2 space-y-3">
              {comments.map((comment) => (
                <div key={comment.id} className="flex gap-2">
                  <Avatar
                    src={comment.author_avatar || undefined}
                    name={comment.author_name}
                    size="sm"
                    className="!w-6 !h-6 !text-[10px] mt-0.5 flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2">
                      <span className="text-xs font-medium text-brand-text">
                        {comment.author_name}
                      </span>
                      <span className="text-[10px] text-brand-muted">
                        {new Date(comment.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-sm text-brand-muted mt-0.5">
                      {comment.content}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <form onSubmit={handleAddComment} className="mt-3 flex gap-2">
              <input
                type="text"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Write a comment..."
                className="flex-1 px-3 py-2 rounded-lg bg-brand-bg border border-brand-border/60 text-brand-text text-sm outline-none focus:border-brand-blue/50"
              />
              <Button size="sm" type="submit" disabled={!newComment.trim()}>
                Send
              </Button>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}
