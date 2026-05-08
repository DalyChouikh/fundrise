from rest_framework import serializers

from apps.startups.models import Industry, Startup, StartupMember, StartupFollow, StartupInvitation
from apps.users.serializers import UserProfileMinimalSerializer


class IndustrySerializer(serializers.ModelSerializer):
    class Meta:
        model = Industry
        fields = ["id", "name"]


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
            "registration_id", "legal_form",
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


class InvitationCreateSerializer(serializers.Serializer):
    email = serializers.EmailField()

    def validate_email(self, value):
        value = value.lower()
        startup = self.context["startup"]

        # Check if email is already a member
        if StartupMember.objects.filter(startup=startup, user__email=value).exists():
            raise serializers.ValidationError(
                "This person is already a member of this startup."
            )

        # Check no pending invite
        if StartupInvitation.objects.filter(
            startup=startup, email=value, status="pending"
        ).exists():
            raise serializers.ValidationError(
                "A pending invitation already exists for this email."
            )

        return value


class InvitationListSerializer(serializers.ModelSerializer):
    invited_by = UserProfileMinimalSerializer(read_only=True)

    class Meta:
        model = StartupInvitation
        fields = ["id", "email", "status", "invited_by", "created_at"]
        read_only_fields = fields


class InvitationPublicSerializer(serializers.ModelSerializer):
    startup_name = serializers.CharField(source="startup.name")
    startup_id = serializers.IntegerField(source="startup.id")
    startup_logo_url = serializers.URLField(source="startup.logo_url")
    invited_by_name = serializers.CharField(source="invited_by.full_name")
    masked_email = serializers.SerializerMethodField()

    class Meta:
        model = StartupInvitation
        fields = [
            "startup_name", "startup_id", "startup_logo_url",
            "invited_by_name", "masked_email", "status",
        ]
        read_only_fields = fields

    def get_masked_email(self, obj):
        local, domain = obj.email.split("@")
        masked_local = local[0] + "***" if len(local) > 1 else "***"
        return f"{masked_local}@{domain}"
