from django.db.models import Count, Q
from django.shortcuts import get_object_or_404
from rest_framework import generics, permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.campaigns.models import Campaign, CampaignComment, CampaignMilestone, CampaignUpdate
from apps.campaigns.permissions import (
    IsCampaignStartupFounderOrAdmin,
    IsCampaignStartupMemberFromURL,
    IsCampaignStartupMemberOrAdmin,
)
from apps.campaigns.serializers import (
    CampaignCommentCreateSerializer,
    CampaignCommentSerializer,
    CampaignCreateSerializer,
    CampaignDetailSerializer,
    CampaignEditSerializer,
    CampaignListSerializer,
    CampaignMilestoneCreateSerializer,
    CampaignMilestoneSerializer,
    CampaignUpdateReadSerializer,
    CampaignUpdateWriteSerializer,
)
from apps.chat.models import ChatRoom, ChatRoomParticipant
from apps.startups.models import StartupMember
from apps.notifications.utils import create_notification


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

    def perform_create(self, serializer):
        campaign = serializer.save()
        # Auto-create a campaign chat room with all startup members
        room = ChatRoom.objects.create(
            room_type=ChatRoom.RoomType.CAMPAIGN,
            campaign=campaign,
        )
        members = StartupMember.objects.filter(
            startup=campaign.startup
        ).select_related("user")
        ChatRoomParticipant.objects.bulk_create(
            [ChatRoomParticipant(room=room, user=m.user) for m in members]
        )

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

    @action(detail=True, methods=["post"], url_path="approve")
    def approve(self, request, pk=None):
        if request.user.role != "admin":
            return Response(
                {"detail": "Only admins can approve campaigns."},
                status=status.HTTP_403_FORBIDDEN,
            )
        campaign = self.get_object()
        if campaign.status == Campaign.Status.ACTIVE:
            return Response(
                {"detail": "Campaign is already active."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        campaign.status = Campaign.Status.ACTIVE
        campaign.save(update_fields=["status", "updated_at"])
        create_notification(
            recipient=campaign.startup.created_by,
            notification_type="campaign_approved",
            title="Campaign Approved",
            message=f'Your campaign "{campaign.title}" has been approved and is now active.',
            related_object=campaign,
        )
        return Response({"status": "active"})

    @action(detail=True, methods=["post"], url_path="reject")
    def reject(self, request, pk=None):
        if request.user.role != "admin":
            return Response(
                {"detail": "Only admins can reject campaigns."},
                status=status.HTTP_403_FORBIDDEN,
            )
        campaign = self.get_object()
        campaign.status = Campaign.Status.REJECTED
        campaign.save(update_fields=["status", "updated_at"])
        create_notification(
            recipient=campaign.startup.created_by,
            notification_type="campaign_rejected",
            title="Campaign Rejected",
            message=f'Your campaign "{campaign.title}" has been rejected.',
            related_object=campaign,
        )
        return Response({"status": "rejected"})


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


class CampaignCommentListCreateView(generics.ListCreateAPIView):
    permission_classes = [permissions.IsAuthenticated]

    def get_serializer_class(self):
        if self.request.method == "POST":
            return CampaignCommentCreateSerializer
        return CampaignCommentSerializer

    def get_queryset(self):
        return (
            CampaignComment.objects.filter(
                campaign_id=self.kwargs["campaign_pk"],
                parent__isnull=True,
            )
            .select_related("author")
            .prefetch_related("replies__author")
            .order_by("-created_at")
        )

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx["campaign_id"] = int(self.kwargs["campaign_pk"])
        return ctx

    def perform_create(self, serializer):
        campaign = get_object_or_404(Campaign, pk=self.kwargs["campaign_pk"])
        serializer.save(campaign=campaign, author=self.request.user)

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        comment = (
            CampaignComment.objects.filter(pk=serializer.instance.pk)
            .select_related("author")
            .prefetch_related("replies__author")
            .first()
        )
        return Response(
            CampaignCommentSerializer(comment).data,
            status=status.HTTP_201_CREATED,
        )
