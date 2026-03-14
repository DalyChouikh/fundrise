import uuid

from django.db import models

from apps.core.models import TimeStampedModel


class UserProfile(TimeStampedModel):
    class Role(models.TextChoices):
        FOUNDER = "founder", "Founder"
        TEAM_MEMBER = "team_member", "Team Member"
        INVESTOR = "investor", "Investor"
        ADMIN = "admin", "Admin"

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
    )
    email = models.EmailField(unique=True)
    full_name = models.CharField(max_length=255)
    avatar_url = models.URLField(max_length=500, blank=True, default="")
    role = models.CharField(
        max_length=20,
        choices=Role.choices,
        default=Role.INVESTOR,
    )
    bio = models.TextField(blank=True, default="")

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.full_name} ({self.email})"
