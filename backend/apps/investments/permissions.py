from rest_framework.permissions import BasePermission

from apps.startups.models import StartupMember


class IsInvestmentOwnerOrAdmin(BasePermission):
    def has_object_permission(self, request, view, obj):
        return request.user.role == "admin" or obj.investor == request.user


class IsCampaignStartupFounderForInvestment(BasePermission):
    """Check if user is a founder of the startup that owns the investment's campaign."""

    def has_object_permission(self, request, view, obj):
        if request.user.role == "admin":
            return True
        return StartupMember.objects.filter(
            startup=obj.campaign.startup,
            user=request.user,
            role=StartupMember.Role.FOUNDER,
        ).exists()
