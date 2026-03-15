from rest_framework.permissions import BasePermission

from apps.startups.models import StartupMember


class IsStartupMemberOrAdmin(BasePermission):
    """Object-level: user is a member of the Startup, or admin."""

    def has_object_permission(self, request, view, obj):
        if request.user.role == "admin":
            return True
        return StartupMember.objects.filter(
            startup=obj, user=request.user
        ).exists()


class IsStartupCreatorOrAdmin(BasePermission):
    """Object-level: user is the startup's created_by, or admin."""

    def has_object_permission(self, request, view, obj):
        if request.user.role == "admin":
            return True
        return obj.created_by_id == request.user.pk


class IsStartupFounderFromURL(BasePermission):
    """View-level: user is a founder of the startup from startup_pk URL kwarg."""

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.user.role == "admin":
            return True
        startup_pk = view.kwargs.get("startup_pk")
        if not startup_pk:
            return False
        return StartupMember.objects.filter(
            startup_id=startup_pk,
            user=request.user,
            role=StartupMember.Role.FOUNDER,
        ).exists()
