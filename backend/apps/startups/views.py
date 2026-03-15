from django.db import transaction
from django.db.models import Count, Q
from django.shortcuts import get_object_or_404
from rest_framework import generics, permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.startups.models import Startup, StartupFollow, StartupMember
from apps.startups.permissions import (
    IsStartupCreatorOrAdmin,
    IsStartupFounderFromURL,
    IsStartupMemberOrAdmin,
)
from apps.startups.serializers import (
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

        return qs.filter(
            Q(status=Startup.Status.ACTIVE)
            | Q(created_by=user)
            | Q(id__in=user_startup_ids)
        ).distinct()

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
