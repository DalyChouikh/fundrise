from rest_framework.permissions import BasePermission

from apps.startups.models import StartupMember


class IsFounder(BasePermission):
    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and request.user.role == "founder"
        )


class IsTeamMember(BasePermission):
    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and request.user.role == "team_member"
        )


class IsInvestor(BasePermission):
    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and request.user.role == "investor"
        )


class IsAdmin(BasePermission):
    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and request.user.role == "admin"
        )


class IsStartupMember(BasePermission):
    """
    Checks if the user is a member of the startup referenced in the view.
    Expects startup_id or pk in view.kwargs.
    """

    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False

        startup_id = view.kwargs.get("startup_id") or view.kwargs.get("pk")
        if not startup_id:
            return False

        return StartupMember.objects.filter(
            startup_id=startup_id,
            user=request.user,
        ).exists()
