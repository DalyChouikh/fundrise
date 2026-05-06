import logging

import requests
from django.conf import settings
from django.db.models import Q
from django.shortcuts import get_object_or_404
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

logger = logging.getLogger(__name__)

from apps.notifications.utils import create_notification
from apps.users.email import send_approval_email, send_rejection_email
from apps.users.models import InvestorProfile, SavedPaymentInfo, UserProfile
from apps.users.permissions import IsAdmin
from apps.users.step_up import require_step_up_if_passkey
from apps.users.serializers import (
    AdminUserSerializer,
    InvestorProfileSerializer,
    SavedPaymentInfoSerializer,
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

    @require_step_up_if_passkey
    def post(self, request):
        user = request.user
        supabase_uid = str(user.id)

        # Delete Django profile (cascades to all related data)
        user.delete()

        # Delete Supabase Auth user
        if settings.SUPABASE_URL and settings.SUPABASE_SERVICE_ROLE_KEY:
            try:
                requests.delete(
                    f"{settings.SUPABASE_URL}/auth/v1/admin/users/{supabase_uid}",
                    headers={
                        "apikey": settings.SUPABASE_SERVICE_ROLE_KEY,
                        "Authorization": f"Bearer {settings.SUPABASE_SERVICE_ROLE_KEY}",
                    },
                    timeout=10,
                )
            except Exception:
                logger.warning("Failed to delete Supabase auth user %s", supabase_uid)

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


class PaymentProfileView(APIView):
    """GET/PUT/DELETE /api/users/me/payment-profile/ — investor saved card + address."""

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        try:
            info = request.user.payment_info
        except SavedPaymentInfo.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)
        return Response(SavedPaymentInfoSerializer(info).data)

    @require_step_up_if_passkey
    def put(self, request):
        try:
            info = request.user.payment_info
        except SavedPaymentInfo.DoesNotExist:
            info = SavedPaymentInfo(user=request.user)
        serializer = SavedPaymentInfoSerializer(info, data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(user=request.user)
        return Response(serializer.data)

    @require_step_up_if_passkey
    def delete(self, request):
        try:
            request.user.payment_info.delete()
        except SavedPaymentInfo.DoesNotExist:
            pass
        return Response(status=status.HTTP_204_NO_CONTENT)


from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from apps.core.async_auth import authenticate_async


@csrf_exempt
async def extract_document_view(request):
    await authenticate_async(request)
    if not request.user.is_authenticated:
        return JsonResponse({"error": "Unauthorized"}, status=401)
    if request.method != "POST":
        return JsonResponse({"error": "Method not allowed"}, status=405)

    doc_type = request.GET.get("type", "")
    if doc_type not in ("investor", "startup"):
        return JsonResponse({"error": "type must be 'investor' or 'startup'"}, status=400)

    file = request.FILES.get("file")
    if not file:
        return JsonResponse({"error": "file is required"}, status=400)
    if file.size > 20 * 1024 * 1024:
        return JsonResponse({"error": "File too large (max 20MB)"}, status=400)

    from asgiref.sync import sync_to_async
    from apps.users.extract import extract_document

    file_bytes = await sync_to_async(file.read)()
    result = await extract_document(file_bytes, file.name, doc_type, str(request.user.id))
    return JsonResponse(result)
