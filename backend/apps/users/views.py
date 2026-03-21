from django.db.models import Q
from django.shortcuts import get_object_or_404
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.notifications.utils import create_notification
from apps.users.email import send_approval_email, send_rejection_email
from apps.users.models import InvestorProfile, UserProfile
from apps.users.permissions import IsAdmin
from apps.users.serializers import (
    AdminUserSerializer,
    InvestorProfileSerializer,
    UserProfileMinimalSerializer,
    UserProfileSerializer,
)


class UserProfileMeView(generics.RetrieveUpdateAPIView):
    """
    GET  /api/users/me/ - Retrieve the current user's profile.
    PATCH /api/users/me/ - Update profile (full_name, bio, avatar_url).
    """

    serializer_class = UserProfileSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return self.request.user


class UserListView(generics.ListAPIView):
    """Admin-only: list all users with search and role filtering."""

    serializer_class = AdminUserSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdmin]

    def get_queryset(self):
        qs = UserProfile.objects.all()
        search = self.request.query_params.get("search")
        if search:
            qs = qs.filter(
                Q(full_name__icontains=search) | Q(email__icontains=search)
            )
        role = self.request.query_params.get("role")
        if role:
            qs = qs.filter(role=role)
        approval_status = self.request.query_params.get("approval_status")
        if approval_status:
            qs = qs.filter(approval_status=approval_status)
        return qs


class UserDetailView(generics.RetrieveUpdateAPIView):
    """Admin-only: view/edit any user profile."""

    serializer_class = AdminUserSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdmin]
    queryset = UserProfile.objects.all()


class UserSearchView(generics.ListAPIView):
    """Search users by name — available to all authenticated users."""

    serializer_class = UserProfileMinimalSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        search = self.request.query_params.get("search", "")
        if len(search) < 2:
            return UserProfile.objects.none()
        return (
            UserProfile.objects.filter(Q(full_name__icontains=search))
            .exclude(id=self.request.user.id)[:20]
        )


class InvestorProfileView(APIView):
    """GET/POST /api/users/me/investor-profile/ — get or upsert investor profile."""

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        try:
            profile = request.user.investor_profile
        except InvestorProfile.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)
        serializer = InvestorProfileSerializer(profile)
        return Response(serializer.data)

    def post(self, request):
        profile, _created = InvestorProfile.objects.update_or_create(
            user=request.user,
            defaults={},
        )
        serializer = InvestorProfileSerializer(profile, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


class DeleteAccountView(APIView):
    """POST /api/users/me/delete/ — user deletes their own account."""

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        user = request.user
        user.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class CompleteOnboardingView(APIView):
    """POST /api/users/me/complete-onboarding/ — mark onboarding as done."""

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        request.user.onboarding_completed = True
        request.user.save(update_fields=["onboarding_completed"])
        serializer = UserProfileSerializer(request.user)
        return Response(serializer.data)


class UserApproveView(APIView):
    """POST /api/users/<uuid>/approve/ — admin approves a user."""

    permission_classes = [permissions.IsAuthenticated, IsAdmin]

    def post(self, request, pk):
        user = get_object_or_404(UserProfile, pk=pk)
        user.approval_status = "approved"
        user.rejection_reason = ""
        user.save(update_fields=["approval_status", "rejection_reason"])
        create_notification(
            recipient=user,
            notification_type="user_approved",
            title="Account Approved",
            message="Your account has been approved! You now have full access to the platform.",
            related_object=user,
        )
        send_approval_email(user)
        return Response(AdminUserSerializer(user).data)


class UserRejectView(APIView):
    """POST /api/users/<uuid>/reject/ — admin rejects a user with reason."""

    permission_classes = [permissions.IsAuthenticated, IsAdmin]

    def post(self, request, pk):
        reason = request.data.get("reason", "").strip()
        if not reason:
            return Response(
                {"detail": "Reason is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        user = get_object_or_404(UserProfile, pk=pk)
        user.approval_status = "rejected"
        user.rejection_reason = reason
        user.save(update_fields=["approval_status", "rejection_reason"])
        create_notification(
            recipient=user,
            notification_type="user_rejected",
            title="Account Not Approved",
            message=f"Your account was not approved. Reason: {reason}",
            related_object=user,
        )
        send_rejection_email(user, reason)
        return Response(AdminUserSerializer(user).data)
