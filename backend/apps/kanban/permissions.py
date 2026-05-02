from rest_framework.permissions import BasePermission

from apps.startups.models import StartupMember


class IsStartupMemberForKanban(BasePermission):
    """Write access: user must be a startup member."""

    def has_permission(self, request, view):
        startup_id = view.kwargs.get("startup_pk") or view.kwargs.get("startup_id")
        if not startup_id:
            return False
        return (
            StartupMember.objects.filter(startup_id=startup_id, user=request.user).exists()
            or request.user.role == "admin"
        )


class CanViewKanbanBoard(BasePermission):
    """Read access: startup members OR investors with a confirmed investment in an active campaign."""

    def has_permission(self, request, view):
        from apps.investments.models import Investment

        startup_id = view.kwargs.get("startup_pk") or view.kwargs.get("startup_id")
        if not startup_id:
            return False
        if request.user.role == "admin":
            return True
        if StartupMember.objects.filter(startup_id=startup_id, user=request.user).exists():
            return True
        if request.user.role == "investor":
            return Investment.objects.filter(
                investor=request.user,
                status="confirmed",
                campaign__status="active",
                campaign__startup_id=startup_id,
            ).exists()
        return False
