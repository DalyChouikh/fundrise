import uuid

from django.db import models

from apps.core.models import TimeStampedModel


class CopilotConversation(TimeStampedModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        "users.UserProfile",
        on_delete=models.CASCADE,
        related_name="copilot_conversations",
    )
    title = models.CharField(max_length=255, blank=True, default="")

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"Copilot: {self.user} - {self.title or 'Untitled'}"


class CopilotMessage(models.Model):
    class Role(models.TextChoices):
        USER = "user", "User"
        ASSISTANT = "assistant", "Assistant"
        TOOL = "tool", "Tool"

    conversation = models.ForeignKey(
        CopilotConversation,
        on_delete=models.CASCADE,
        related_name="messages",
    )
    role = models.CharField(max_length=10, choices=Role.choices)
    content = models.TextField(blank=True, default="")
    tool_calls = models.JSONField(null=True, blank=True)
    tool_name = models.CharField(max_length=100, blank=True, default="")
    thinking_content = models.TextField(blank=True, null=True)
    thinking_duration = models.FloatField(null=True, blank=True)
    media_url = models.URLField(max_length=500, null=True, blank=True)
    media_type = models.CharField(max_length=10, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at"]

    def __str__(self):
        return f"[{self.role}] {self.content[:50]}"
