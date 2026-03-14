from django.db import models

from apps.core.models import TimeStampedModel


class Campaign(TimeStampedModel):
    class Status(models.TextChoices):
        DRAFT = "draft", "Draft"
        PENDING_APPROVAL = "pending_approval", "Pending Approval"
        ACTIVE = "active", "Active"
        COMPLETED = "completed", "Completed"
        REJECTED = "rejected", "Rejected"

    startup = models.ForeignKey(
        "startups.Startup",
        on_delete=models.CASCADE,
        related_name="campaigns",
    )
    title = models.CharField(max_length=255)
    description = models.TextField()
    funding_goal = models.DecimalField(max_digits=12, decimal_places=2)
    current_funding = models.DecimalField(
        max_digits=12, decimal_places=2, default=0
    )
    equity_offered = models.DecimalField(max_digits=5, decimal_places=2)
    deadline = models.DateTimeField()
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.DRAFT,
    )

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.title} ({self.startup.name})"

    @property
    def funding_percentage(self):
        if self.funding_goal == 0:
            return 0
        return round((self.current_funding / self.funding_goal) * 100, 2)


class CampaignUpdate(TimeStampedModel):
    campaign = models.ForeignKey(
        Campaign,
        on_delete=models.CASCADE,
        related_name="updates",
    )
    title = models.CharField(max_length=255)
    content = models.TextField()
    created_by = models.ForeignKey(
        "users.UserProfile",
        on_delete=models.CASCADE,
        related_name="campaign_updates",
    )

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.title} - {self.campaign.title}"


class CampaignMilestone(TimeStampedModel):
    campaign = models.ForeignKey(
        Campaign,
        on_delete=models.CASCADE,
        related_name="milestones",
    )
    title = models.CharField(max_length=255)
    description = models.TextField()
    target_date = models.DateField()
    is_completed = models.BooleanField(default=False)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["target_date"]

    def __str__(self):
        status = "Done" if self.is_completed else "Pending"
        return f"{self.title} [{status}]"
