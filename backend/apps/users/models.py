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
    role_selected = models.BooleanField(default=False)
    onboarding_completed = models.BooleanField(default=False)
    company = models.CharField(max_length=255, blank=True, default="")
    job_title = models.CharField(max_length=255, blank=True, default="")
    linkedin_url = models.URLField(max_length=500, blank=True, default="")

    class ApprovalStatus(models.TextChoices):
        PENDING = "pending_approval", "Pending Approval"
        APPROVED = "approved", "Approved"
        REJECTED = "rejected", "Rejected"

    approval_status = models.CharField(
        max_length=20,
        choices=ApprovalStatus.choices,
        default=ApprovalStatus.PENDING,
    )
    rejection_reason = models.TextField(blank=True, default="")
    identity_document_url = models.URLField(max_length=500, null=True, blank=True)
    company_document_url = models.URLField(max_length=500, null=True, blank=True)
    date_of_birth = models.DateField(null=True, blank=True)
    id_number = models.CharField(max_length=50, null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.full_name} ({self.email})"

    @property
    def is_authenticated(self):
        return True

    @property
    def is_anonymous(self):
        return False


class InvestorProfile(TimeStampedModel):
    class PreferredStage(models.TextChoices):
        PRE_SEED = "pre_seed", "Pre-Seed"
        SEED = "seed", "Seed"
        SERIES_A = "series_a", "Series A"
        SERIES_B_PLUS = "series_b_plus", "Series B+"

    class AccreditationStatus(models.TextChoices):
        ACCREDITED = "accredited", "Accredited"
        NON_ACCREDITED = "non_accredited", "Non-Accredited"
        PREFER_NOT_TO_SAY = "prefer_not_to_say", "Prefer Not to Say"

    user = models.OneToOneField(
        UserProfile,
        on_delete=models.CASCADE,
        related_name="investor_profile",
    )
    preferred_industries = models.JSONField(default=list, blank=True)
    check_size_min = models.IntegerField(null=True, blank=True)
    check_size_max = models.IntegerField(null=True, blank=True)
    preferred_stage = models.CharField(
        max_length=20,
        choices=PreferredStage.choices,
        blank=True,
        default="",
    )
    accreditation_status = models.CharField(
        max_length=20,
        choices=AccreditationStatus.choices,
        blank=True,
        default="",
    )
    accreditation_description = models.TextField(blank=True, default="")

    def __str__(self):
        return f"InvestorProfile({self.user.full_name})"


class SavedPaymentInfo(TimeStampedModel):
    CARD_TYPES = [
        ("visa", "Visa"),
        ("mastercard", "Mastercard"),
        ("amex", "American Express"),
        ("discover", "Discover"),
    ]

    user = models.OneToOneField(
        UserProfile,
        on_delete=models.CASCADE,
        related_name="payment_info",
    )
    card_holder = models.CharField(max_length=255)
    card_last4 = models.CharField(max_length=4)
    card_type = models.CharField(max_length=20, choices=CARD_TYPES)
    expiry_month = models.PositiveSmallIntegerField()
    expiry_year = models.PositiveSmallIntegerField()
    address_line1 = models.CharField(max_length=255)
    address_line2 = models.CharField(max_length=255, blank=True, default="")
    city = models.CharField(max_length=100)
    state = models.CharField(max_length=100)
    postal_code = models.CharField(max_length=20)
    country = models.CharField(max_length=100)

    def __str__(self):
        return f"{self.user.full_name} — {self.card_type} ···{self.card_last4}"
