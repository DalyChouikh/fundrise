from django.db.models import Q
from rest_framework import generics, permissions

from apps.users.models import UserProfile
from apps.users.permissions import IsAdmin
from apps.users.serializers import AdminUserSerializer, UserProfileSerializer


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
        return qs


class UserDetailView(generics.RetrieveUpdateAPIView):
    """Admin-only: view/edit any user profile."""

    serializer_class = AdminUserSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdmin]
    queryset = UserProfile.objects.all()
