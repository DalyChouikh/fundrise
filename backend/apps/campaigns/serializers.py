from rest_framework import serializers

from apps.campaigns.models import Campaign, CampaignComment, CampaignMilestone, CampaignUpdate
from apps.startups.models import Startup, StartupMember
from apps.users.serializers import UserProfileMinimalSerializer


class CampaignListSerializer(serializers.ModelSerializer):
    startup_name = serializers.CharField(source="startup.name", read_only=True)
    startup_logo_url = serializers.URLField(source="startup.logo_url", read_only=True, default="")
    funding_percentage = serializers.ReadOnlyField()

    class Meta:
        model = Campaign
        fields = [
            "id", "title", "description", "startup", "startup_name", "startup_logo_url",
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


class CampaignCommentSerializer(serializers.ModelSerializer):
    author_detail = UserProfileMinimalSerializer(source="author", read_only=True)
    replies = serializers.SerializerMethodField()
    reply_count = serializers.SerializerMethodField()

    class Meta:
        model = CampaignComment
        fields = [
            "id", "campaign", "author", "author_detail",
            "parent", "content", "replies", "reply_count",
            "created_at", "updated_at",
        ]
        read_only_fields = [
            "id", "campaign", "author", "author_detail",
            "replies", "reply_count", "created_at", "updated_at",
        ]

    def get_replies(self, obj):
        # Only include replies for top-level comments
        if obj.parent is not None:
            return []
        replies = obj.replies.select_related("author").order_by("created_at")
        return CampaignCommentSerializer(replies, many=True).data

    def get_reply_count(self, obj):
        return obj.replies.count()


class CampaignCommentCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = CampaignComment
        fields = ["content", "parent"]

    def validate_parent(self, value):
        if value and value.campaign_id != self.context["campaign_id"]:
            raise serializers.ValidationError(
                "Parent comment must belong to the same campaign."
            )
        if value and value.parent is not None:
            raise serializers.ValidationError(
                "Replies can only be one level deep."
            )
        return value
