from django.db.models import Count
from rest_framework import generics, permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.kanban.models import KanbanColumn, KanbanTask, TaskComment
from apps.kanban.permissions import CanViewKanbanBoard, IsStartupMemberForKanban
from apps.kanban.serializers import (
    KanbanColumnSerializer,
    KanbanTaskCreateSerializer,
    KanbanTaskMoveSerializer,
    KanbanTaskSerializer,
    TaskCommentCreateSerializer,
    TaskCommentSerializer,
)
from apps.notifications.utils import create_notification


class KanbanBoardView(generics.ListAPIView):
    """GET /api/kanban/{startup_id}/board/ — all columns with nested tasks."""

    serializer_class = KanbanColumnSerializer
    permission_classes = [permissions.IsAuthenticated, CanViewKanbanBoard]

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

    def get_permissions(self):
        if self.action in ("list", "retrieve"):
            return [permissions.IsAuthenticated(), CanViewKanbanBoard()]
        return [permissions.IsAuthenticated(), IsStartupMemberForKanban()]

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

    def get_permissions(self):
        if self.action in ("list", "retrieve"):
            return [permissions.IsAuthenticated(), CanViewKanbanBoard()]
        return [permissions.IsAuthenticated(), IsStartupMemberForKanban()]

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
        # Notify assignee if assigned on creation
        if task.assignee and task.assignee != request.user:
            create_notification(
                recipient=task.assignee,
                notification_type="task_assigned",
                title="Task Assigned",
                message=f'You have been assigned to "{task.title}".',
                related_object=task,
            )
        return Response(
            KanbanTaskSerializer(task).data,
            status=status.HTTP_201_CREATED,
        )

    def perform_update(self, serializer):
        old_assignee = serializer.instance.assignee
        instance = serializer.save()
        # Notify new assignee if assignee changed
        if (
            instance.assignee
            and instance.assignee != old_assignee
            and instance.assignee != self.request.user
        ):
            create_notification(
                recipient=instance.assignee,
                notification_type="task_assigned",
                title="Task Assigned",
                message=f'You have been assigned to "{instance.title}".',
                related_object=instance,
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
            .select_related("author", "task__created_by", "task__assignee")
            .first()
        )
        # Notify task creator and assignee about new comment
        task = comment.task
        recipients = set()
        if task.created_by and task.created_by != request.user:
            recipients.add(task.created_by)
        if task.assignee and task.assignee != request.user:
            recipients.add(task.assignee)
        for recipient in recipients:
            create_notification(
                recipient=recipient,
                notification_type="task_comment",
                title="New Comment on Task",
                message=f'{request.user.full_name} commented on "{task.title}".',
                related_object=task,
            )
        return Response(
            TaskCommentSerializer(comment).data,
            status=status.HTTP_201_CREATED,
        )
