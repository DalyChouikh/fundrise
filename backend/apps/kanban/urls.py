from django.urls import path

from apps.kanban import views

urlpatterns = [
    # Board view — all columns + tasks for a startup
    path(
        "<int:startup_id>/board/",
        views.KanbanBoardView.as_view(),
        name="kanban-board",
    ),
    # Columns CRUD
    path(
        "<int:startup_pk>/columns/",
        views.KanbanColumnViewSet.as_view({"get": "list", "post": "create"}),
        name="kanban-column-list",
    ),
    path(
        "<int:startup_pk>/columns/<int:pk>/",
        views.KanbanColumnViewSet.as_view(
            {"get": "retrieve", "patch": "partial_update", "delete": "destroy"}
        ),
        name="kanban-column-detail",
    ),
    # Tasks CRUD
    path(
        "<int:startup_pk>/tasks/",
        views.KanbanTaskViewSet.as_view({"get": "list", "post": "create"}),
        name="kanban-task-list",
    ),
    path(
        "<int:startup_pk>/tasks/<int:pk>/",
        views.KanbanTaskViewSet.as_view(
            {"get": "retrieve", "patch": "partial_update", "delete": "destroy"}
        ),
        name="kanban-task-detail",
    ),
    path(
        "<int:startup_pk>/tasks/<int:pk>/move/",
        views.KanbanTaskViewSet.as_view({"post": "move"}),
        name="kanban-task-move",
    ),
    # Task comments
    path(
        "tasks/<int:task_pk>/comments/",
        views.TaskCommentListCreateView.as_view(),
        name="kanban-task-comments",
    ),
]
