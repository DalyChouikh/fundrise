import uuid

from django.db import models
from django.db.models import Q

from apps.core.models import TimeStampedModel


class Industry(TimeStampedModel):
    name = models.CharField(max_length=100, unique=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["name"]
        verbose_name_plural = "industries"

    def __str__(self):
        return self.name


class Startup(TimeStampedModel):
    class Status(models.TextChoices):
        PENDING_APPROVAL = "pending_approval", "Pending Approval"
        ACTIVE = "active", "Active"
        SUSPENDED = "suspended", "Suspended"

    name = models.CharField(max_length=255)
    description = models.TextField()
    industry = models.CharField(max_length=100)
    location = models.CharField(max_length=255)
    founding_date = models.DateField()
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING_APPROVAL,
    )
    pitch_deck_url = models.URLField(max_length=500, blank=True, default="")
    logo_url = models.URLField(max_length=500, blank=True, default="")
    website = models.URLField(max_length=500, blank=True, default="")
    registration_id = models.CharField(max_length=100, blank=True, default="")
    legal_form = models.CharField(max_length=50, blank=True, default="")
    created_by = models.ForeignKey(
        "users.UserProfile",
        on_delete=models.CASCADE,
        related_name="founded_startups",
    )

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return self.name


class StartupMember(models.Model):
    class Role(models.TextChoices):
        FOUNDER = "founder", "Founder"
        TEAM_MEMBER = "team_member", "Team Member"

    startup = models.ForeignKey(
        Startup,
        on_delete=models.CASCADE,
        related_name="members",
    )
    user = models.ForeignKey(
        "users.UserProfile",
        on_delete=models.CASCADE,
        related_name="startup_memberships",
    )
    role = models.CharField(
        max_length=20,
        choices=Role.choices,
        default=Role.TEAM_MEMBER,
    )
    joined_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["startup", "user"],
                name="unique_startup_member",
            ),
        ]
        ordering = ["joined_at"]

    def __str__(self):
        return f"{self.user} - {self.startup} ({self.role})"


class StartupFollow(models.Model):
    startup = models.ForeignKey(
        Startup,
        on_delete=models.CASCADE,
        related_name="followers",
    )
    user = models.ForeignKey(
        "users.UserProfile",
        on_delete=models.CASCADE,
        related_name="followed_startups",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["startup", "user"],
                name="unique_startup_follow",
            ),
        ]
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.user} follows {self.startup}"


class StartupInvitation(TimeStampedModel):
    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        ACCEPTED = "accepted", "Accepted"
        CANCELLED = "cancelled", "Cancelled"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    startup = models.ForeignKey(
        Startup,
        on_delete=models.CASCADE,
        related_name="invitations",
    )
    email = models.EmailField()
    token = models.CharField(max_length=64, unique=True, db_index=True)
    invited_by = models.ForeignKey(
        "users.UserProfile",
        on_delete=models.CASCADE,
        related_name="sent_invitations",
    )
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING,
    )

    class Meta:
        ordering = ["-created_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["startup", "email"],
                condition=Q(status="pending"),
                name="unique_pending_invite",
            ),
        ]

    def __str__(self):
        return f"Invite {self.email} to {self.startup} ({self.status})"
