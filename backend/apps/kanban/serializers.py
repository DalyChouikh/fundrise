from rest_framework import serializers

from apps.kanban.models import KanbanColumn, KanbanTask, TaskComment
from apps.users.serializers import UserProfileMinimalSerializer


class TaskCommentSerializer(serializers.ModelSerializer):
    author_name = serializers.CharField(source="author.full_name", read_only=True)
    author_avatar = serializers.CharField(source="author.avatar_url", read_only=True)

    class Meta:
        model = TaskComment
        fields = ["id", "task", "author", "author_name", "author_avatar", "content", "created_at"]
        read_only_fields = ["id", "author", "author_name", "author_avatar", "created_at"]


class TaskCommentCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = TaskComment
        fields = ["content"]


class KanbanTaskSerializer(serializers.ModelSerializer):
    assignee_detail = UserProfileMinimalSerializer(source="assignee", read_only=True)
    comments_count = serializers.IntegerField(read_only=True, default=0)

    class Meta:
        model = KanbanTask
        fields = [
            "id", "column", "title", "description", "assignee",
            "assignee_detail", "order", "comments_count",
            "created_by", "created_at", "updated_at",
        ]
        read_only_fields = ["id", "created_by", "created_at", "updated_at"]


class KanbanTaskCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = KanbanTask
        fields = ["column", "title", "description", "assignee"]


class KanbanTaskMoveSerializer(serializers.Serializer):
    column = serializers.IntegerField()
    order = serializers.IntegerField()


class KanbanColumnSerializer(serializers.ModelSerializer):
    tasks = KanbanTaskSerializer(many=True, read_only=True)

    class Meta:
        model = KanbanColumn
        fields = ["id", "startup", "name", "order", "tasks", "created_at"]
        read_only_fields = ["id", "startup", "created_at"]
