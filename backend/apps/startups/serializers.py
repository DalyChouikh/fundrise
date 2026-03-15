from rest_framework import serializers

from apps.startups.models import Startup, StartupMember, StartupFollow
from apps.users.serializers import UserProfileMinimalSerializer


class StartupMemberSerializer(serializers.ModelSerializer):
    user = UserProfileMinimalSerializer(read_only=True)

    class Meta:
        model = StartupMember
        fields = ["id", "user", "role", "joined_at"]
        read_only_fields = fields


class StartupMemberCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = StartupMember
        fields = ["user", "role"]

    def validate_role(self, value):
        if value == StartupMember.Role.FOUNDER:
            raise serializers.ValidationError(
                "Cannot add another founder. Use team_member role."
            )
        return value


class StartupListSerializer(serializers.ModelSerializer):
    created_by = UserProfileMinimalSerializer(read_only=True)
    members_count = serializers.IntegerField(read_only=True)
    followers_count = serializers.IntegerField(read_only=True)
    is_following = serializers.SerializerMethodField()

    class Meta:
        model = Startup
        fields = [
            "id", "name", "description", "industry", "location",
            "founding_date", "status", "logo_url", "website",
            "created_by", "members_count", "followers_count",
            "is_following", "created_at", "updated_at",
        ]
        read_only_fields = fields

    def get_is_following(self, obj):
        user = self.context["request"].user
        return StartupFollow.objects.filter(startup=obj, user=user).exists()


class StartupDetailSerializer(StartupListSerializer):
    members = StartupMemberSerializer(many=True, read_only=True)
    is_member = serializers.SerializerMethodField()

    class Meta(StartupListSerializer.Meta):
        fields = StartupListSerializer.Meta.fields + [
            "pitch_deck_url", "members", "is_member",
        ]

    def get_is_member(self, obj):
        user = self.context["request"].user
        return StartupMember.objects.filter(startup=obj, user=user).exists()


class StartupCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Startup
        fields = [
            "name", "description", "industry", "location",
            "founding_date", "pitch_deck_url", "logo_url", "website",
        ]


class StartupEditSerializer(serializers.ModelSerializer):
    class Meta:
        model = Startup
        fields = [
            "name", "description", "industry", "location",
            "founding_date", "pitch_deck_url", "logo_url", "website",
            "status",
        ]

    def validate_status(self, value):
        request = self.context.get("request")
        if request and request.user.role != "admin":
            raise serializers.ValidationError(
                "Only admins can change startup status."
            )
        return value
