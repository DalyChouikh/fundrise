from rest_framework import serializers

from apps.users.models import InvestorProfile, UserProfile


class UserProfileMinimalSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserProfile
        fields = ["id", "full_name", "avatar_url", "role"]
        read_only_fields = fields


class UserProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserProfile
        fields = [
            "id",
            "email",
            "full_name",
            "avatar_url",
            "role",
            "bio",
            "role_selected",
            "onboarding_completed",
            "company",
            "job_title",
            "linkedin_url",
            "approval_status",
            "rejection_reason",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "email",
            "approval_status",
            "rejection_reason",
            "created_at",
            "updated_at",
        ]

    def validate_role(self, value):
        valid_roles = {choice[0] for choice in UserProfile.Role.choices}
        if value not in valid_roles:
            raise serializers.ValidationError("Invalid role.")
        if value == UserProfile.Role.ADMIN:
            raise serializers.ValidationError("Cannot self-assign admin role.")
        return value

    def update(self, instance, validated_data):
        if "role" in validated_data:
            validated_data["role_selected"] = True
        return super().update(instance, validated_data)


class AdminUserSerializer(serializers.ModelSerializer):
    """Admin-only serializer that allows setting any role including admin."""

    class Meta:
        model = UserProfile
        fields = [
            "id",
            "email",
            "full_name",
            "avatar_url",
            "role",
            "bio",
            "role_selected",
            "onboarding_completed",
            "company",
            "job_title",
            "linkedin_url",
            "approval_status",
            "rejection_reason",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "email", "created_at", "updated_at"]


class InvestorProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = InvestorProfile
        fields = [
            "preferred_industries",
            "check_size_min",
            "check_size_max",
            "preferred_stage",
            "accreditation_status",
            "accreditation_description",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["created_at", "updated_at"]
