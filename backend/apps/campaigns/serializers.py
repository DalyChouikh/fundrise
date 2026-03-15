from rest_framework import serializers

from apps.campaigns.models import Campaign, CampaignMilestone, CampaignUpdate
from apps.startups.models import Startup, StartupMember
from apps.users.serializers import UserProfileMinimalSerializer


class CampaignListSerializer(serializers.ModelSerializer):
    startup_name = serializers.CharField(source="startup.name", read_only=True)
    funding_percentage = serializers.ReadOnlyField()

    class Meta:
        model = Campaign
        fields = [
            "id", "title", "description", "startup", "startup_name",
            "funding_goal", "current_funding", "funding_percentage",
            "equity_offered", "deadline", "status",
            "created_at", "updated_at",
        ]
        read_only_fields = fields


class CampaignDetailSerializer(CampaignListSerializer):
    updates_count = serializers.IntegerField(read_only=True)
    milestones_count = serializers.IntegerField(read_only=True)
    is_startup_member = serializers.SerializerMethodField()

    class Meta(CampaignListSerializer.Meta):
        fields = CampaignListSerializer.Meta.fields + [
            "updates_count", "milestones_count", "is_startup_member",
        ]

    def get_is_startup_member(self, obj):
        user = self.context["request"].user
        return StartupMember.objects.filter(
            startup=obj.startup, user=user
        ).exists()


class CampaignCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Campaign
        fields = [
            "startup", "title", "description",
            "funding_goal", "equity_offered", "deadline",
        ]

    def validate_startup(self, value):
        user = self.context["request"].user
        if value.status != Startup.Status.ACTIVE:
            raise serializers.ValidationError(
                "Startup must be active to create a campaign."
            )
        if user.role != "admin" and not StartupMember.objects.filter(
            startup=value, user=user
        ).exists():
            raise serializers.ValidationError(
                "You must be a member of this startup."
            )
        return value


class CampaignEditSerializer(serializers.ModelSerializer):
    class Meta:
        model = Campaign
        fields = [
            "title", "description", "funding_goal",
            "equity_offered", "deadline", "status",
        ]

    def validate_status(self, value):
        request = self.context.get("request")
        if request and request.user.role != "admin":
            raise serializers.ValidationError(
                "Only admins can change campaign status."
            )
        return value


class CampaignUpdateReadSerializer(serializers.ModelSerializer):
    created_by = UserProfileMinimalSerializer(read_only=True)

    class Meta:
        model = CampaignUpdate
        fields = ["id", "title", "content", "created_by", "created_at", "updated_at"]
        read_only_fields = fields


class CampaignUpdateWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = CampaignUpdate
        fields = ["title", "content"]


class CampaignMilestoneSerializer(serializers.ModelSerializer):
    class Meta:
        model = CampaignMilestone
        fields = [
            "id", "title", "description", "target_date",
            "is_completed", "completed_at", "created_at", "updated_at",
        ]
        read_only_fields = ["id", "completed_at", "created_at", "updated_at"]


class CampaignMilestoneCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = CampaignMilestone
        fields = ["title", "description", "target_date"]
