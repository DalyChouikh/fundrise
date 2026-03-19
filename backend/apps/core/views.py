from django.db.models import Sum
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from apps.campaigns.models import Campaign
from apps.investments.models import Investment
from apps.startups.models import Startup, StartupFollow, StartupMember
from apps.users.models import UserProfile


@api_view(["GET"])
@permission_classes([AllowAny])
def health_check(request):
    return Response({"status": "ok", "service": "funderaise-api"})


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def dashboard_stats(request):
    user = request.user
    role = user.role

    if role == "admin":
        total_users = UserProfile.objects.count()
        active_startups = Startup.objects.filter(
            status=Startup.Status.ACTIVE
        ).count()
        active_campaigns = Campaign.objects.filter(
            status=Campaign.Status.ACTIVE
        ).count()
        total_invested = (
            Investment.objects.filter(status=Investment.Status.CONFIRMED).aggregate(
                total=Sum("amount")
            )["total"]
            or 0
        )
        pending_users = UserProfile.objects.filter(
            approval_status="pending_approval"
        ).count()
        return Response(
            {
                "total_users": total_users,
                "active_startups": active_startups,
                "active_campaigns": active_campaigns,
                "total_invested": str(total_invested),
                "pending_users": pending_users,
            }
        )

    if role == "investor":
        investments = Investment.objects.filter(investor=user)
        confirmed = investments.filter(status=Investment.Status.CONFIRMED)
        total_invested = confirmed.aggregate(total=Sum("amount"))["total"] or 0
        active_investments = confirmed.count()
        following_count = StartupFollow.objects.filter(user=user).count()
        return Response(
            {
                "total_invested": str(total_invested),
                "active_investments": active_investments,
                "following_count": following_count,
                "portfolio_value": str(total_invested),
            }
        )

    # Founder / team_member
    user_startup_ids = StartupMember.objects.filter(
        user=user
    ).values_list("startup_id", flat=True)

    active_campaigns = Campaign.objects.filter(
        startup_id__in=user_startup_ids,
        status=Campaign.Status.ACTIVE,
    ).count()

    total_raised = (
        Investment.objects.filter(
            campaign__startup_id__in=user_startup_ids,
            status=Investment.Status.CONFIRMED,
        ).aggregate(total=Sum("amount"))["total"]
        or 0
    )

    team_members = StartupMember.objects.filter(
        startup_id__in=user_startup_ids
    ).values("user").distinct().count()

    followers = StartupFollow.objects.filter(
        startup_id__in=user_startup_ids
    ).count()

    return Response(
        {
            "active_campaigns": active_campaigns,
            "total_raised": str(total_raised),
            "team_members": team_members,
            "followers": followers,
        }
    )
