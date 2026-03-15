from rest_framework import serializers

from apps.campaigns.models import Campaign
from apps.investments.models import Investment
from apps.startups.models import StartupMember


class InvestmentCampaignSerializer(serializers.ModelSerializer):
    startup_name = serializers.CharField(source="startup.name", read_only=True)

    class Meta:
        model = Campaign
        fields = ["id", "title", "startup_name", "funding_goal", "current_funding", "status"]
        read_only_fields = fields


class InvestmentListSerializer(serializers.ModelSerializer):
    campaign_detail = InvestmentCampaignSerializer(source="campaign", read_only=True)
    investor_name = serializers.CharField(source="investor.full_name", read_only=True)

    class Meta:
        model = Investment
        fields = [
            "id", "campaign", "campaign_detail", "investor", "investor_name",
            "amount", "status", "created_at", "updated_at",
        ]
        read_only_fields = fields


class InvestmentCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Investment
        fields = ["campaign", "amount"]

    def validate_campaign(self, value):
        if value.status != Campaign.Status.ACTIVE:
            raise serializers.ValidationError(
                "Can only invest in active campaigns."
            )
        return value

    def validate_amount(self, value):
        if value <= 0:
            raise serializers.ValidationError(
                "Investment amount must be greater than zero."
            )
        return value
