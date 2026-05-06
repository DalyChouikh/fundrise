from rest_framework import serializers

from apps.users.models import InvestorProfile, SavedPaymentInfo, UserProfile


class UserProfileMinimalSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserProfile
        fields = ["id", "full_name", "avatar_url", "role"]
        read_only_fields = fields


class UserProfileSerializer(serializers.ModelSerializer):
    has_passkeys = serializers.SerializerMethodField(read_only=True)

    def get_has_passkeys(self, instance):
        return instance.passkeys.exists()

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
            "identity_document_url",
            "company_document_url",
            "date_of_birth",
            "id_number",
            "has_passkeys",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "email",
            "has_passkeys",
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
            "identity_document_url",
            "company_document_url",
            "date_of_birth",
            "id_number",
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


class SavedPaymentInfoSerializer(serializers.ModelSerializer):
    class Meta:
        model = SavedPaymentInfo
        fields = [
            "card_holder", "card_last4", "card_type",
            "expiry_month", "expiry_year",
            "address_line1", "address_line2", "city",
            "state", "postal_code", "country",
            "created_at", "updated_at",
        ]
        read_only_fields = ["created_at", "updated_at"]

    def validate_card_last4(self, value):
        if not value.isdigit() or len(value) != 4:
            raise serializers.ValidationError("Must be exactly 4 digits.")
        return value

    def validate_expiry_month(self, value):
        if not 1 <= value <= 12:
            raise serializers.ValidationError("Month must be between 1 and 12.")
        return value
