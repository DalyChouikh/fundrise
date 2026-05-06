from django.db import transaction
from django.db.models import F, Q
from rest_framework import mixins, permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.campaigns.models import Campaign
from apps.investments.models import Investment
from apps.investments.permissions import (
    IsCampaignStartupFounderForInvestment,
    IsInvestmentOwnerOrAdmin,
)
from apps.investments.serializers import InvestmentCreateSerializer, InvestmentListSerializer
from apps.notifications.utils import create_notification
from apps.startups.models import StartupMember
from apps.users.permissions import IsInvestor
from apps.users.step_up import require_step_up_if_passkey


class InvestmentViewSet(
    mixins.CreateModelMixin,
    mixins.RetrieveModelMixin,
    mixins.ListModelMixin,
    viewsets.GenericViewSet,
):
    def get_serializer_class(self):
        if self.action == "create":
            return InvestmentCreateSerializer
        return InvestmentListSerializer

    def get_permissions(self):
        if self.action == "create":
            return [permissions.IsAuthenticated(), IsInvestor()]
        if self.action in ("confirm", "cancel"):
            return [permissions.IsAuthenticated()]
        return [permissions.IsAuthenticated()]

    def get_queryset(self):
        user = self.request.user
        qs = Investment.objects.select_related(
            "campaign", "campaign__startup", "investor"
        )

        if user.role == "admin":
            return qs

        if user.role == "investor":
            return qs.filter(investor=user)

        # Founders/team members see investments in their startups' campaigns
        user_startup_ids = StartupMember.objects.filter(
            user=user
        ).values_list("startup_id", flat=True)
        return qs.filter(campaign__startup_id__in=user_startup_ids)

    def create(self, request, *args, **kwargs):
        if request.user.approval_status != "approved":
            return Response(
                {"detail": "Your account must be approved to invest."},
                status=status.HTTP_403_FORBIDDEN,
            )
        return super().create(request, *args, **kwargs)

    def perform_create(self, serializer):
        investment = serializer.save(investor=self.request.user)
        # Notify startup founders about new investment
        campaign = investment.campaign
        founders = StartupMember.objects.filter(
            startup=campaign.startup, role=StartupMember.Role.FOUNDER
        ).select_related("user")
        for member in founders:
            if member.user != self.request.user:
                create_notification(
                    recipient=member.user,
                    notification_type="investment_received",
                    title="New Investment Received",
                    message=f"{self.request.user.full_name} invested ${investment.amount} in {campaign.title}.",
                    related_object=investment,
                )

    @action(
        detail=True,
        methods=["post"],
        url_path="confirm",
        permission_classes=[
            permissions.IsAuthenticated,
            IsCampaignStartupFounderForInvestment,
        ],
    )
    @require_step_up_if_passkey
    def confirm(self, request, pk=None):
        investment = self.get_object()
        if investment.status != Investment.Status.PENDING:
            return Response(
                {"detail": "Only pending investments can be confirmed."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        with transaction.atomic():
            investment.status = Investment.Status.CONFIRMED
            investment.save(update_fields=["status", "updated_at"])
            Campaign.objects.filter(pk=investment.campaign_id).update(
                current_funding=F("current_funding") + investment.amount
            )
        # Notify investor that investment was confirmed
        create_notification(
            recipient=investment.investor,
            notification_type="investment_confirmed",
            title="Investment Confirmed",
            message=f"Your ${investment.amount} investment in {investment.campaign.title} has been confirmed.",
            related_object=investment,
        )
        return Response(InvestmentListSerializer(investment).data)

    @action(
        detail=True,
        methods=["post"],
        url_path="cancel",
        permission_classes=[permissions.IsAuthenticated],
    )
    def cancel(self, request, pk=None):
        investment = self.get_object()

        # Only investor, campaign founder, or admin can cancel
        is_owner = investment.investor == request.user
        is_admin = request.user.role == "admin"
        is_founder = StartupMember.objects.filter(
            startup=investment.campaign.startup,
            user=request.user,
            role=StartupMember.Role.FOUNDER,
        ).exists()

        if not (is_owner or is_admin or is_founder):
            return Response(
                {"detail": "You don't have permission to cancel this investment."},
                status=status.HTTP_403_FORBIDDEN,
            )

        if investment.status != Investment.Status.PENDING:
            return Response(
                {"detail": "Only pending investments can be cancelled."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        investment.status = Investment.Status.CANCELLED
        investment.save(update_fields=["status", "updated_at"])
        return Response(InvestmentListSerializer(investment).data)
