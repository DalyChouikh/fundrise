from django.db.models import Count, Q
from django.shortcuts import get_object_or_404
from rest_framework import generics, permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.campaigns.models import Campaign, CampaignMilestone, CampaignUpdate
from apps.campaigns.permissions import (
    IsCampaignStartupFounderOrAdmin,
    IsCampaignStartupMemberFromURL,
    IsCampaignStartupMemberOrAdmin,
)
from apps.campaigns.serializers import (
    CampaignCreateSerializer,
    CampaignDetailSerializer,
    CampaignEditSerializer,
    CampaignListSerializer,
    CampaignMilestoneCreateSerializer,
    CampaignMilestoneSerializer,
    CampaignUpdateReadSerializer,
    CampaignUpdateWriteSerializer,
)
from apps.startups.models import StartupMember


class CampaignViewSet(viewsets.ModelViewSet):
    def get_serializer_class(self):
        if self.action == "create":
            return CampaignCreateSerializer
        if self.action in ("update", "partial_update"):
            return CampaignEditSerializer
        if self.action == "retrieve":
            return CampaignDetailSerializer
        return CampaignListSerializer

    def get_permissions(self):
        if self.action in ("update", "partial_update"):
            return [permissions.IsAuthenticated(), IsCampaignStartupMemberOrAdmin()]
        if self.action == "destroy":
            return [permissions.IsAuthenticated(), IsCampaignStartupFounderOrAdmin()]
        if self.action == "submit":
            return [permissions.IsAuthenticated(), IsCampaignStartupMemberOrAdmin()]
        return [permissions.IsAuthenticated()]

    def get_queryset(self):
        user = self.request.user
        qs = Campaign.objects.select_related("startup", "startup__created_by")

        if self.action == "retrieve":
            qs = qs.annotate(
                updates_count=Count("updates", distinct=True),
                milestones_count=Count("milestones", distinct=True),
            )

        if user.role == "admin":
            return qs

        user_startup_ids = StartupMember.objects.filter(
            user=user
        ).values_list("startup_id", flat=True)

        return qs.filter(
            Q(status=Campaign.Status.ACTIVE)
            | Q(startup_id__in=user_startup_ids)
        ).distinct()

    @action(detail=True, methods=["post"], url_path="submit")
    def submit(self, request, pk=None):
        campaign = self.get_object()
        if campaign.status != Campaign.Status.DRAFT:
            return Response(
                {"detail": "Only draft campaigns can be submitted for approval."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        campaign.status = Campaign.Status.PENDING_APPROVAL
        campaign.save(update_fields=["status", "updated_at"])
        serializer = CampaignDetailSerializer(campaign, context={"request": request})
        return Response(serializer.data)


class CampaignUpdateListCreateView(generics.ListCreateAPIView):
    def get_serializer_class(self):
        if self.request.method == "POST":
            return CampaignUpdateWriteSerializer
        return CampaignUpdateReadSerializer

    def get_queryset(self):
        return CampaignUpdate.objects.filter(
            campaign_id=self.kwargs["campaign_pk"]
        ).select_related("created_by")

    def get_permissions(self):
        if self.request.method == "POST":
            return [permissions.IsAuthenticated(), IsCampaignStartupMemberFromURL()]
        return [permissions.IsAuthenticated()]

    def perform_create(self, serializer):
        campaign = get_object_or_404(Campaign, pk=self.kwargs["campaign_pk"])
        serializer.save(campaign=campaign, created_by=self.request.user)


class CampaignMilestoneListCreateView(generics.ListCreateAPIView):
    def get_serializer_class(self):
        if self.request.method == "POST":
            return CampaignMilestoneCreateSerializer
        return CampaignMilestoneSerializer

    def get_queryset(self):
        return CampaignMilestone.objects.filter(
            campaign_id=self.kwargs["campaign_pk"]
        )

    def get_permissions(self):
        if self.request.method == "POST":
            return [permissions.IsAuthenticated(), IsCampaignStartupMemberFromURL()]
        return [permissions.IsAuthenticated()]

    def perform_create(self, serializer):
        campaign = get_object_or_404(Campaign, pk=self.kwargs["campaign_pk"])
        serializer.save(campaign=campaign)
