from django.db.models import Count
from rest_framework import generics, permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.kanban.models import KanbanColumn, KanbanTask, TaskComment
from apps.kanban.permissions import IsStartupMemberForKanban
from apps.kanban.serializers import (
    KanbanColumnSerializer,
    KanbanTaskCreateSerializer,
    KanbanTaskMoveSerializer,
    KanbanTaskSerializer,
    TaskCommentCreateSerializer,
    TaskCommentSerializer,
)


class KanbanBoardView(generics.ListAPIView):
    """GET /api/kanban/{startup_id}/board/ — all columns with nested tasks."""

    serializer_class = KanbanColumnSerializer
    permission_classes = [permissions.IsAuthenticated, IsStartupMemberForKanban]

    def get_queryset(self):
        startup_id = self.kwargs["startup_id"]
        return (
            KanbanColumn.objects.filter(startup_id=startup_id)
            .prefetch_related(
                "tasks",
                "tasks__assignee",
            )
            .order_by("order")
        )


class KanbanColumnViewSet(viewsets.ModelViewSet):
    serializer_class = KanbanColumnSerializer
    permission_classes = [permissions.IsAuthenticated, IsStartupMemberForKanban]

    def get_queryset(self):
        return KanbanColumn.objects.filter(
            startup_id=self.kwargs["startup_pk"]
        ).prefetch_related("tasks", "tasks__assignee")

    def perform_create(self, serializer):
        startup_id = self.kwargs["startup_pk"]
        max_order = (
            KanbanColumn.objects.filter(startup_id=startup_id)
            .order_by("-order")
            .values_list("order", flat=True)
            .first()
        )
        serializer.save(
            startup_id=startup_id,
            order=(max_order or 0) + 1,
        )


class KanbanTaskViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated, IsStartupMemberForKanban]

    def get_serializer_class(self):
        if self.action == "create":
            return KanbanTaskCreateSerializer
        if self.action == "move":
            return KanbanTaskMoveSerializer
        return KanbanTaskSerializer

    def get_queryset(self):
        return (
            KanbanTask.objects.filter(
                column__startup_id=self.kwargs["startup_pk"]
            )
            .select_related("assignee", "created_by")
            .annotate(comments_count=Count("comments"))
        )

    def perform_create(self, serializer):
        max_order = (
            KanbanTask.objects.filter(column=serializer.validated_data["column"])
            .order_by("-order")
            .values_list("order", flat=True)
            .first()
        )
        serializer.save(
            created_by=self.request.user,
            order=(max_order or 0) + 1,
        )

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        # Return full task data with KanbanTaskSerializer
        task = (
            KanbanTask.objects.filter(pk=serializer.instance.pk)
            .select_related("assignee", "created_by")
            .annotate(comments_count=Count("comments"))
            .first()
        )
        return Response(
            KanbanTaskSerializer(task).data,
            status=status.HTTP_201_CREATED,
        )

    @action(detail=True, methods=["post"], url_path="move")
    def move(self, request, startup_pk=None, pk=None):
        task = self.get_object()
        serializer = KanbanTaskMoveSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        new_column_id = serializer.validated_data["column"]
        new_order = serializer.validated_data["order"]

        # Validate column belongs to the same startup
        try:
            new_column = KanbanColumn.objects.get(
                pk=new_column_id, startup_id=startup_pk
            )
        except KanbanColumn.DoesNotExist:
            return Response(
                {"detail": "Column not found in this startup."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        task.column = new_column
        task.order = new_order
        task.save(update_fields=["column", "order", "updated_at"])

        return Response(KanbanTaskSerializer(task).data)


class TaskCommentListCreateView(generics.ListCreateAPIView):
    permission_classes = [permissions.IsAuthenticated]

    def get_serializer_class(self):
        if self.request.method == "POST":
            return TaskCommentCreateSerializer
        return TaskCommentSerializer

    def get_queryset(self):
        return TaskComment.objects.filter(
            task_id=self.kwargs["task_pk"]
        ).select_related("author")

    def perform_create(self, serializer):
        serializer.save(
            author=self.request.user,
            task_id=self.kwargs["task_pk"],
        )

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        comment = (
            TaskComment.objects.filter(pk=serializer.instance.pk)
            .select_related("author")
            .first()
        )
        return Response(
            TaskCommentSerializer(comment).data,
            status=status.HTTP_201_CREATED,
        )
