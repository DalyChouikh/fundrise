from collections import defaultdict

from django.db.models import Count, F, Sum
from django.db.models.functions import TruncMonth
from django.utils import timezone
from dateutil.relativedelta import relativedelta
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


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def dashboard_analytics(request):
    user = request.user
    role = user.role
    six_months_ago = timezone.now() - relativedelta(months=6)

    def fmt(qs):
        """Format TruncMonth querysets: datetime → 'YYYY-MM', Decimal → float."""
        return [
            {k: (v.strftime("%Y-%m") if hasattr(v, "strftime") else float(v) if hasattr(v, "as_tuple") else v)
             for k, v in row.items()}
            for row in qs
        ]

    if role == "admin":
        user_regs = (
            UserProfile.objects.filter(created_at__gte=six_months_ago)
            .annotate(month=TruncMonth("created_at"))
            .values("month")
            .annotate(count=Count("id"))
            .order_by("month")
        )

        now = timezone.now()
        platform_growth = []
        for i in range(5, -1, -1):
            month_end = (now - relativedelta(months=i)).replace(
                day=1, hour=0, minute=0, second=0, microsecond=0
            ) + relativedelta(months=1)
            platform_growth.append({
                "month": (month_end - relativedelta(months=1)).strftime("%Y-%m"),
                "users": UserProfile.objects.filter(created_at__lt=month_end).count(),
                "startups": Startup.objects.filter(created_at__lt=month_end).count(),
                "campaigns": Campaign.objects.filter(created_at__lt=month_end).count(),
            })

        approval_funnel = list(
            UserProfile.objects.values("approval_status")
            .annotate(count=Count("id"))
        )
        for row in approval_funnel:
            row["status"] = row.pop("approval_status")

        inv_volume = (
            Investment.objects.filter(
                status=Investment.Status.CONFIRMED, created_at__gte=six_months_ago
            )
            .annotate(month=TruncMonth("created_at"))
            .values("month")
            .annotate(amount=Sum("amount"))
            .order_by("month")
        )

        return Response({
            "user_registrations": fmt(user_regs),
            "platform_growth": platform_growth,
            "approval_funnel": approval_funnel,
            "investment_volume": fmt(inv_volume),
        })

    if role == "investor":
        confirmed = Investment.objects.filter(investor=user, status=Investment.Status.CONFIRMED)

        allocation = fmt(
            confirmed.values(startup_name=F("campaign__startup__name"))
            .annotate(amount=Sum("amount"))
            .order_by("-amount")
        )

        history = fmt(
            confirmed.filter(created_at__gte=six_months_ago)
            .annotate(month=TruncMonth("created_at"))
            .values("month")
            .annotate(amount=Sum("amount"))
            .order_by("month")
        )

        perf_map = defaultdict(float)
        for inv in confirmed.select_related("campaign"):
            perf_map[inv.campaign.title] += float(inv.amount)
        performance = [
            {"campaign_title": title, "invested": amt, "current_value": amt}
            for title, amt in perf_map.items()
        ]

        return Response({
            "portfolio_allocation": allocation,
            "investment_history": history,
            "portfolio_performance": performance,
        })

    # Founder / team_member
    user_startup_ids = StartupMember.objects.filter(
        user=user
    ).values_list("startup_id", flat=True)

    confirmed_inv = Investment.objects.filter(
        campaign__startup_id__in=user_startup_ids,
        status=Investment.Status.CONFIRMED,
        created_at__gte=six_months_ago,
    )

    funding = fmt(
        confirmed_inv.annotate(month=TruncMonth("created_at"))
        .values("month")
        .annotate(amount=Sum("amount"))
        .order_by("month")
    )

    inv_per_period = fmt(
        confirmed_inv.annotate(month=TruncMonth("created_at"))
        .values("month")
        .annotate(count=Count("id"))
        .order_by("month")
    )

    comparison = list(
        Campaign.objects.filter(
            startup_id__in=user_startup_ids,
            status__in=[Campaign.Status.ACTIVE, Campaign.Status.COMPLETED],
        )
        .annotate(raised=F("current_funding"), goal=F("funding_goal"))
        .values("title", "raised", "goal")
    )
    for row in comparison:
        row["raised"] = float(row["raised"])
        row["goal"] = float(row["goal"])

    followers = fmt(
        StartupFollow.objects.filter(
            startup_id__in=user_startup_ids,
            created_at__gte=six_months_ago,
        )
        .annotate(month=TruncMonth("created_at"))
        .values("month")
        .annotate(count=Count("id"))
        .order_by("month")
    )

    return Response({
        "funding_over_time": funding,
        "investments_per_period": inv_per_period,
        "campaign_comparison": comparison,
        "follower_growth": followers,
    })
