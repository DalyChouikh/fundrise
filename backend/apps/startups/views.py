import secrets

from django.conf import settings
from django.db import transaction
from django.db.models import Count, Q
from django.shortcuts import get_object_or_404
from rest_framework import generics, permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.chat.models import ChatRoom, ChatRoomParticipant
from apps.startups.email import send_invite_email
from apps.startups.models import Startup, StartupFollow, StartupInvitation, StartupMember
from apps.startups.permissions import (
    IsStartupCreatorOrAdmin,
    IsStartupFounderFromURL,
    IsStartupMemberOrAdmin,
)
from apps.startups.serializers import (
    InvitationCreateSerializer,
    InvitationListSerializer,
    InvitationPublicSerializer,
    StartupCreateSerializer,
    StartupDetailSerializer,
    StartupEditSerializer,
    StartupListSerializer,
    StartupMemberCreateSerializer,
    StartupMemberSerializer,
)
from apps.notifications.utils import create_notification
from apps.users.permissions import IsFounder


class StartupViewSet(viewsets.ModelViewSet):
    def get_serializer_class(self):
        if self.action == "create":
            return StartupCreateSerializer
        if self.action in ("update", "partial_update"):
            return StartupEditSerializer
        if self.action == "retrieve":
            return StartupDetailSerializer
        return StartupListSerializer

    def get_permissions(self):
        if self.action == "create":
            return [permissions.IsAuthenticated(), IsFounder()]
        if self.action in ("update", "partial_update"):
            return [permissions.IsAuthenticated(), IsStartupMemberOrAdmin()]
        if self.action == "destroy":
            return [permissions.IsAuthenticated(), IsStartupCreatorOrAdmin()]
        return [permissions.IsAuthenticated()]

    def get_queryset(self):
        user = self.request.user
        qs = Startup.objects.select_related("created_by").annotate(
            members_count=Count("members", distinct=True),
            followers_count=Count("followers", distinct=True),
        )

        if user.role == "admin":
            return qs

        user_startup_ids = StartupMember.objects.filter(
            user=user
        ).values_list("startup_id", flat=True)

        # Founders/team members only see their own startups
        if user.role in ("founder", "team_member"):
            return qs.filter(
                Q(created_by=user) | Q(id__in=user_startup_ids)
            ).distinct()

        # Investors see all active startups
        return qs.filter(
            Q(status=Startup.Status.ACTIVE)
            | Q(created_by=user)
            | Q(id__in=user_startup_ids)
        ).distinct()

    def create(self, request, *args, **kwargs):
        if request.user.approval_status != "approved":
            return Response(
                {"detail": "Your account must be approved to create a startup."},
                status=status.HTTP_403_FORBIDDEN,
            )
        return super().create(request, *args, **kwargs)

    def perform_create(self, serializer):
        with transaction.atomic():
            startup = serializer.save(created_by=self.request.user)
            StartupMember.objects.create(
                startup=startup,
                user=self.request.user,
                role=StartupMember.Role.FOUNDER,
            )

    @action(detail=True, methods=["post"], url_path="follow")
    def follow(self, request, pk=None):
        startup = self.get_object()
        follow_obj, created = StartupFollow.objects.get_or_create(
            startup=startup, user=request.user
        )
        if not created:
            follow_obj.delete()
            return Response({"following": False}, status=status.HTTP_200_OK)
        # Notify startup creator about new follower
        if startup.created_by != request.user:
            create_notification(
                recipient=startup.created_by,
                notification_type="new_follower",
                title="New Follower",
                message=f"{request.user.full_name} started following {startup.name}.",
                related_object=startup,
            )
        return Response({"following": True}, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"], url_path="approve")
    def approve(self, request, pk=None):
        if request.user.role != "admin":
            return Response(
                {"detail": "Only admins can approve startups."},
                status=status.HTTP_403_FORBIDDEN,
            )
        startup = self.get_object()
        if startup.status == Startup.Status.ACTIVE:
            return Response(
                {"detail": "Startup is already active."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        startup.status = Startup.Status.ACTIVE
        startup.save(update_fields=["status", "updated_at"])
        create_notification(
            recipient=startup.created_by,
            notification_type="startup_approved",
            title="Startup Approved",
            message=f'Your startup "{startup.name}" has been approved and is now active.',
            related_object=startup,
        )
        return Response({"status": "active"})

    @action(detail=True, methods=["post"], url_path="reject")
    def reject(self, request, pk=None):
        if request.user.role != "admin":
            return Response(
                {"detail": "Only admins can reject startups."},
                status=status.HTTP_403_FORBIDDEN,
            )
        startup = self.get_object()
        startup.status = Startup.Status.SUSPENDED
        startup.save(update_fields=["status", "updated_at"])
        create_notification(
            recipient=startup.created_by,
            notification_type="startup_approved",
            title="Startup Suspended",
            message=f'Your startup "{startup.name}" has been suspended.',
            related_object=startup,
        )
        return Response({"status": "suspended"})


class StartupMemberListCreateView(generics.ListCreateAPIView):
    def get_serializer_class(self):
        if self.request.method == "POST":
            return StartupMemberCreateSerializer
        return StartupMemberSerializer

    def get_queryset(self):
        return StartupMember.objects.filter(
            startup_id=self.kwargs["startup_pk"]
        ).select_related("user")

    def get_permissions(self):
        if self.request.method == "POST":
            return [permissions.IsAuthenticated(), IsStartupFounderFromURL()]
        return [permissions.IsAuthenticated()]

    def perform_create(self, serializer):
        startup = get_object_or_404(Startup, pk=self.kwargs["startup_pk"])
        serializer.save(startup=startup)


class StartupMemberDestroyView(generics.DestroyAPIView):
    queryset = StartupMember.objects.all()
    permission_classes = [permissions.IsAuthenticated, IsStartupFounderFromURL]


# --- Invitation Views ---


class StartupInvitationCreateView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsStartupFounderFromURL]

    def post(self, request, startup_pk):
        startup = get_object_or_404(Startup, pk=startup_pk)
        serializer = InvitationCreateSerializer(
            data=request.data,
            context={"startup": startup, "request": request},
        )
        serializer.is_valid(raise_exception=True)

        email = serializer.validated_data["email"]
        token = secrets.token_urlsafe(32)

        invitation = StartupInvitation.objects.create(
            startup=startup,
            email=email,
            token=token,
            invited_by=request.user,
        )

        email_sent = send_invite_email(invitation)
        invite_url = f"{settings.FRONTEND_URL}/invite/{token}"

        return Response(
            {
                "id": str(invitation.id),
                "email": email,
                "invite_url": invite_url,
                "email_sent": email_sent,
            },
            status=status.HTTP_201_CREATED,
        )


class StartupInvitationListView(generics.ListAPIView):
    serializer_class = InvitationListSerializer
    permission_classes = [permissions.IsAuthenticated, IsStartupFounderFromURL]

    def get_queryset(self):
        return (
            StartupInvitation.objects.filter(
                startup_id=self.kwargs["startup_pk"],
                status="pending",
            )
            .select_related("invited_by")
        )


class StartupInvitationCancelView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsStartupFounderFromURL]

    def post(self, request, startup_pk, pk):
        invitation = get_object_or_404(
            StartupInvitation,
            pk=pk,
            startup_id=startup_pk,
            status="pending",
        )
        invitation.status = "cancelled"
        invitation.save(update_fields=["status", "updated_at"])
        return Response({"status": "cancelled"})


class InvitationPublicDetailView(generics.RetrieveAPIView):
    authentication_classes = []
    permission_classes = [permissions.AllowAny]
    serializer_class = InvitationPublicSerializer
    lookup_field = "token"
    queryset = StartupInvitation.objects.select_related("startup", "invited_by")


class InvitationAcceptView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, token):
        with transaction.atomic():
            invitation = get_object_or_404(
                StartupInvitation.objects.select_for_update().select_related(
                    "startup", "invited_by"
                ),
                token=token,
            )

            if invitation.status != "pending":
                return Response(
                    {"detail": f"This invitation has already been {invitation.status}."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            if request.user.email.lower() != invitation.email.lower():
                return Response(
                    {"detail": "This invitation was sent to a different email address."},
                    status=status.HTTP_403_FORBIDDEN,
                )

            if request.user.role_selected and request.user.role not in ("team_member",):
                return Response(
                    {
                        "detail": (
                            f"Users with the '{request.user.role}' role cannot accept "
                            "team member invitations."
                        )
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

            if StartupMember.objects.filter(
                startup=invitation.startup, user=request.user
            ).exists():
                return Response(
                    {"detail": "You are already a member of this startup."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            StartupMember.objects.create(
                startup=invitation.startup,
                user=request.user,
                role=StartupMember.Role.TEAM_MEMBER,
            )

            if request.user.role != "team_member":
                request.user.role = "team_member"
                request.user.role_selected = True
                request.user.onboarding_completed = True
                request.user.approval_status = "approved"
                request.user.save(update_fields=["role", "role_selected", "onboarding_completed", "approval_status"])
            else:
                updates = []
                if not request.user.onboarding_completed:
                    request.user.onboarding_completed = True
                    updates.append("onboarding_completed")
                if request.user.approval_status != "approved":
                    request.user.approval_status = "approved"
                    updates.append("approval_status")
                if updates:
                    request.user.save(update_fields=updates)

            invitation.status = "accepted"
            invitation.save(update_fields=["status", "updated_at"])

            # Add the new member to all campaign chat rooms for this startup
            campaign_rooms = ChatRoom.objects.filter(
                room_type=ChatRoom.RoomType.CAMPAIGN,
                campaign__startup=invitation.startup,
            ).exclude(
                room_participants__user=request.user,
            )
            ChatRoomParticipant.objects.bulk_create(
                [ChatRoomParticipant(room=room, user=request.user) for room in campaign_rooms],
                ignore_conflicts=True,
            )

        create_notification(
            recipient=invitation.invited_by,
            notification_type="new_follower",
            title="Invitation Accepted",
            message=(
                f"{request.user.full_name} has accepted your invitation "
                f"to join {invitation.startup.name}."
            ),
            related_object=invitation.startup,
        )

        return Response({
            "startup_id": invitation.startup.id,
            "startup_name": invitation.startup.name,
        })
