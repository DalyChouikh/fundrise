from rest_framework.permissions import BasePermission

from apps.startups.models import StartupMember


class IsCampaignStartupMemberOrAdmin(BasePermission):
    """Object-level: user is a member of the campaign's startup, or admin."""

    def has_object_permission(self, request, view, obj):
        if request.user.role == "admin":
            return True
        return StartupMember.objects.filter(
            startup=obj.startup, user=request.user
        ).exists()


class IsCampaignStartupFounderOrAdmin(BasePermission):
    """Object-level: user is a founder of the campaign's startup, or admin."""

    def has_object_permission(self, request, view, obj):
        if request.user.role == "admin":
            return True
        return StartupMember.objects.filter(
            startup=obj.startup,
            user=request.user,
            role=StartupMember.Role.FOUNDER,
        ).exists()


class IsCampaignStartupMemberFromURL(BasePermission):
    """View-level: user is a member of the startup owning the campaign from URL kwarg."""

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.user.role == "admin":
            return True

        from apps.campaigns.models import Campaign

        campaign_pk = view.kwargs.get("campaign_pk")
        if not campaign_pk:
            return False

        try:
            campaign = Campaign.objects.select_related("startup").get(pk=campaign_pk)
        except Campaign.DoesNotExist:
            return False

        return StartupMember.objects.filter(
            startup=campaign.startup, user=request.user
        ).exists()
