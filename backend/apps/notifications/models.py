from django.contrib.contenttypes.fields import GenericForeignKey
from django.contrib.contenttypes.models import ContentType
from django.db import models


class Notification(models.Model):
    class NotificationType(models.TextChoices):
        INVESTMENT_RECEIVED = "investment_received", "Investment Received"
        INVESTMENT_CONFIRMED = "investment_confirmed", "Investment Confirmed"
        CAMPAIGN_UPDATE = "campaign_update", "Campaign Update"
        CAMPAIGN_APPROVED = "campaign_approved", "Campaign Approved"
        CAMPAIGN_REJECTED = "campaign_rejected", "Campaign Rejected"
        MILESTONE_COMPLETED = "milestone_completed", "Milestone Completed"
        STARTUP_APPROVED = "startup_approved", "Startup Approved"
        NEW_MESSAGE = "new_message", "New Message"
        NEW_FOLLOWER = "new_follower", "New Follower"
        TASK_ASSIGNED = "task_assigned", "Task Assigned"
        TASK_COMMENT = "task_comment", "Task Comment"
        USER_APPROVED = "user_approved", "User Approved"
        USER_REJECTED = "user_rejected", "User Rejected"

    recipient = models.ForeignKey(
        "users.UserProfile",
        on_delete=models.CASCADE,
        related_name="notifications",
    )
    notification_type = models.CharField(
        max_length=30,
        choices=NotificationType.choices,
    )
    title = models.CharField(max_length=255)
    message = models.TextField()
    is_read = models.BooleanField(default=False)

    related_content_type = models.ForeignKey(
        ContentType,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
    )
    related_object_id = models.CharField(max_length=255, null=True, blank=True)
    related_object = GenericForeignKey("related_content_type", "related_object_id")

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(
                fields=["recipient", "is_read", "-created_at"],
                name="idx_notif_recipient_unread",
            ),
        ]

    def __str__(self):
        return f"[{self.notification_type}] {self.title} -> {self.recipient}"
