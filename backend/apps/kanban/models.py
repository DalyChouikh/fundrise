from django.db import models

from apps.core.models import TimeStampedModel


class KanbanColumn(models.Model):
    startup = models.ForeignKey(
        "startups.Startup",
        on_delete=models.CASCADE,
        related_name="kanban_columns",
    )
    name = models.CharField(max_length=100)
    order = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["order"]
        constraints = [
            models.UniqueConstraint(
                fields=["startup", "order"],
                name="unique_column_order_per_startup",
            ),
        ]

    def __str__(self):
        return f"{self.name} ({self.startup.name})"


class KanbanTask(TimeStampedModel):
    column = models.ForeignKey(
        KanbanColumn,
        on_delete=models.CASCADE,
        related_name="tasks",
    )
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True, default="")
    assignee = models.ForeignKey(
        "users.UserProfile",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="assigned_tasks",
    )
    order = models.PositiveIntegerField(default=0)
    attachments = models.JSONField(
        default=list,
        blank=True,
    )
    created_by = models.ForeignKey(
        "users.UserProfile",
        on_delete=models.CASCADE,
        related_name="created_tasks",
    )

    class Meta:
        ordering = ["order"]

    def __str__(self):
        return self.title


class TaskComment(models.Model):
    task = models.ForeignKey(
        KanbanTask,
        on_delete=models.CASCADE,
        related_name="comments",
    )
    author = models.ForeignKey(
        "users.UserProfile",
        on_delete=models.CASCADE,
        related_name="task_comments",
    )
    content = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at"]

    def __str__(self):
        return f"Comment by {self.author} on {self.task}"
