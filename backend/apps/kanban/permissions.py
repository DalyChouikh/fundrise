from rest_framework.permissions import BasePermission

from apps.startups.models import StartupMember


class IsStartupMemberForKanban(BasePermission):
    """User must be a member of the startup to access its kanban board."""

    def has_permission(self, request, view):
        startup_id = view.kwargs.get("startup_pk") or view.kwargs.get("startup_id")
        if not startup_id:
            return False
        return StartupMember.objects.filter(
            startup_id=startup_id,
            user=request.user,
        ).exists() or request.user.role == "admin"
