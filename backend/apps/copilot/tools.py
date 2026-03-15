import logging

from django.db.models import Count, Q, Sum

from apps.campaigns.models import Campaign, CampaignMilestone
from apps.investments.models import Investment
from apps.kanban.models import KanbanTask
from apps.notifications.models import Notification
from apps.startups.models import Startup, StartupFollow, StartupMember

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Tool implementations
# ---------------------------------------------------------------------------


def get_my_profile(user):
    return {
        "id": str(user.id),
        "full_name": user.full_name,
        "email": user.email,
        "role": user.role,
        "bio": user.bio or "",
        "avatar_url": user.avatar_url or "",
        "created_at": str(user.created_at),
    }


def get_my_startups(user):
    memberships = (
        StartupMember.objects.filter(user=user)
        .select_related("startup")
        .annotate(
            members_count=Count("startup__members"),
            followers_count=Count("startup__followers"),
        )
    )
    return {
        "startups": [
            {
                "id": m.startup.id,
                "name": m.startup.name,
                "industry": m.startup.industry,
                "status": m.startup.status,
                "your_role": m.role,
                "members_count": m.members_count,
                "followers_count": m.followers_count,
            }
            for m in memberships
        ]
    }


def get_startup_details(user, startup_id):
    try:
        startup = Startup.objects.annotate(
            members_count=Count("members"),
            followers_count=Count("followers"),
            campaigns_count=Count("campaigns"),
        ).get(id=startup_id)
    except Startup.DoesNotExist:
        return {"error": "Startup not found"}

    total_raised = (
        Investment.objects.filter(
            campaign__startup=startup,
            status=Investment.Status.CONFIRMED,
        ).aggregate(total=Sum("amount"))["total"]
        or 0
    )

    members = StartupMember.objects.filter(startup=startup).select_related("user")

    return {
        "id": startup.id,
        "name": startup.name,
        "description": startup.description,
        "industry": startup.industry,
        "status": startup.status,
        "location": startup.location,
        "members_count": startup.members_count,
        "followers_count": startup.followers_count,
        "campaigns_count": startup.campaigns_count,
        "total_raised": str(total_raised),
        "members": [
            {"name": m.user.full_name, "role": m.role} for m in members
        ],
    }


def get_my_campaigns(user):
    if user.role == "admin":
        campaigns = Campaign.objects.select_related("startup")
    elif user.role == "investor":
        campaign_ids = Investment.objects.filter(investor=user).values_list(
            "campaign_id", flat=True
        )
        campaigns = Campaign.objects.filter(id__in=campaign_ids).select_related(
            "startup"
        )
    else:
        startup_ids = StartupMember.objects.filter(user=user).values_list(
            "startup_id", flat=True
        )
        campaigns = Campaign.objects.filter(
            startup_id__in=startup_ids
        ).select_related("startup")

    return {
        "campaigns": [
            {
                "id": c.id,
                "title": c.title,
                "startup_name": c.startup.name,
                "funding_goal": str(c.funding_goal),
                "current_funding": str(c.current_funding),
                "funding_percentage": c.funding_percentage,
                "equity_offered": str(c.equity_offered),
                "status": c.status,
                "deadline": str(c.deadline),
            }
            for c in campaigns[:20]
        ]
    }


def get_campaign_details(user, campaign_id):
    try:
        campaign = (
            Campaign.objects.select_related("startup")
            .annotate(
                investments_count=Count("investments"),
                updates_count=Count("updates"),
                milestones_count=Count("milestones"),
            )
            .get(id=campaign_id)
        )
    except Campaign.DoesNotExist:
        return {"error": "Campaign not found"}

    confirmed_total = (
        Investment.objects.filter(
            campaign=campaign, status=Investment.Status.CONFIRMED
        ).aggregate(total=Sum("amount"))["total"]
        or 0
    )

    milestones = CampaignMilestone.objects.filter(campaign=campaign)

    return {
        "id": campaign.id,
        "title": campaign.title,
        "startup_name": campaign.startup.name,
        "description": campaign.description[:500],
        "funding_goal": str(campaign.funding_goal),
        "current_funding": str(campaign.current_funding),
        "funding_percentage": campaign.funding_percentage,
        "equity_offered": str(campaign.equity_offered),
        "status": campaign.status,
        "deadline": str(campaign.deadline),
        "confirmed_investment_total": str(confirmed_total),
        "investments_count": campaign.investments_count,
        "updates_count": campaign.updates_count,
        "milestones": [
            {
                "title": m.title,
                "target_date": str(m.target_date),
                "is_completed": m.is_completed,
            }
            for m in milestones
        ],
    }


def get_my_investments(user):
    if user.role == "investor":
        investments = Investment.objects.filter(investor=user).select_related(
            "campaign__startup"
        )
    elif user.role in ("founder", "team_member"):
        startup_ids = StartupMember.objects.filter(user=user).values_list(
            "startup_id", flat=True
        )
        investments = Investment.objects.filter(
            campaign__startup_id__in=startup_ids
        ).select_related("campaign__startup", "investor")
    elif user.role == "admin":
        investments = Investment.objects.all().select_related(
            "campaign__startup", "investor"
        )[:50]
    else:
        investments = Investment.objects.none()

    confirmed = investments.filter(status=Investment.Status.CONFIRMED)
    total_confirmed = confirmed.aggregate(total=Sum("amount"))["total"] or 0

    return {
        "total_investments": investments.count(),
        "confirmed_total": str(total_confirmed),
        "investments": [
            {
                "id": i.id,
                "campaign_title": i.campaign.title,
                "startup_name": i.campaign.startup.name,
                "amount": str(i.amount),
                "status": i.status,
                "investor_name": (
                    i.investor.full_name if hasattr(i, "investor") else None
                ),
                "created_at": str(i.created_at),
            }
            for i in investments[:20]
        ],
    }


def get_my_tasks(user):
    tasks = (
        KanbanTask.objects.filter(assignee=user)
        .select_related("column__startup")
        .order_by("-created_at")[:20]
    )
    return {
        "tasks": [
            {
                "id": t.id,
                "title": t.title,
                "description": (t.description or "")[:200],
                "column_name": t.column.name,
                "startup_name": t.column.startup.name,
                "created_at": str(t.created_at),
            }
            for t in tasks
        ]
    }


def get_platform_stats(user):
    if user.role == "admin":
        return {
            "total_users": _count_users(),
            "active_startups": Startup.objects.filter(
                status=Startup.Status.ACTIVE
            ).count(),
            "active_campaigns": Campaign.objects.filter(
                status=Campaign.Status.ACTIVE
            ).count(),
            "total_invested": str(
                Investment.objects.filter(
                    status=Investment.Status.CONFIRMED
                ).aggregate(total=Sum("amount"))["total"]
                or 0
            ),
        }

    if user.role == "investor":
        confirmed = Investment.objects.filter(
            investor=user, status=Investment.Status.CONFIRMED
        )
        return {
            "total_invested": str(
                confirmed.aggregate(total=Sum("amount"))["total"] or 0
            ),
            "active_investments": confirmed.count(),
            "following_count": StartupFollow.objects.filter(user=user).count(),
        }

    # founder / team_member
    startup_ids = StartupMember.objects.filter(user=user).values_list(
        "startup_id", flat=True
    )
    return {
        "active_campaigns": Campaign.objects.filter(
            startup_id__in=startup_ids, status=Campaign.Status.ACTIVE
        ).count(),
        "total_raised": str(
            Investment.objects.filter(
                campaign__startup_id__in=startup_ids,
                status=Investment.Status.CONFIRMED,
            ).aggregate(total=Sum("amount"))["total"]
            or 0
        ),
        "team_members": StartupMember.objects.filter(
            startup_id__in=startup_ids
        )
        .values("user")
        .distinct()
        .count(),
        "followers": StartupFollow.objects.filter(
            startup_id__in=startup_ids
        ).count(),
    }


def _count_users():
    from apps.users.models import UserProfile

    return UserProfile.objects.count()


def search_campaigns(user, query):
    campaigns = (
        Campaign.objects.filter(
            status=Campaign.Status.ACTIVE,
        )
        .filter(Q(title__icontains=query) | Q(description__icontains=query))
        .select_related("startup")[:10]
    )
    return {
        "results": [
            {
                "id": c.id,
                "title": c.title,
                "startup_name": c.startup.name,
                "funding_goal": str(c.funding_goal),
                "current_funding": str(c.current_funding),
                "funding_percentage": c.funding_percentage,
                "deadline": str(c.deadline),
            }
            for c in campaigns
        ]
    }


def get_notifications_summary(user):
    unread_count = Notification.objects.filter(
        recipient=user, is_read=False
    ).count()
    recent = Notification.objects.filter(recipient=user, is_read=False).order_by(
        "-created_at"
    )[:5]
    return {
        "unread_count": unread_count,
        "recent": [
            {
                "title": n.title,
                "message": n.message,
                "type": n.notification_type,
                "created_at": str(n.created_at),
            }
            for n in recent
        ],
    }


def get_campaign_milestones(user, campaign_id):
    try:
        campaign = Campaign.objects.get(id=campaign_id)
    except Campaign.DoesNotExist:
        return {"error": "Campaign not found"}

    milestones = CampaignMilestone.objects.filter(campaign=campaign)
    completed = milestones.filter(is_completed=True).count()

    return {
        "campaign_title": campaign.title,
        "total_milestones": milestones.count(),
        "completed_milestones": completed,
        "milestones": [
            {
                "id": m.id,
                "title": m.title,
                "description": m.description[:200],
                "target_date": str(m.target_date),
                "is_completed": m.is_completed,
                "completed_at": str(m.completed_at) if m.completed_at else None,
            }
            for m in milestones
        ],
    }


# ---------------------------------------------------------------------------
# Tool definitions for OpenAI-compatible function calling
# ---------------------------------------------------------------------------

TOOL_DEFINITIONS = [
    {
        "type": "function",
        "function": {
            "name": "get_my_profile",
            "description": "Get the current user's profile information including name, email, role, and bio.",
            "parameters": {
                "type": "object",
                "properties": {},
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_my_startups",
            "description": "Get all startups where the current user is a member (founder or team member). Returns startup name, industry, status, and membership details.",
            "parameters": {
                "type": "object",
                "properties": {},
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_startup_details",
            "description": "Get detailed information about a specific startup including team members, campaign count, and total raised.",
            "parameters": {
                "type": "object",
                "properties": {
                    "startup_id": {
                        "type": "integer",
                        "description": "The ID of the startup to look up",
                    },
                },
                "required": ["startup_id"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_my_campaigns",
            "description": "Get campaigns relevant to the current user. Founders see their startups' campaigns, investors see campaigns they invested in, admins see all.",
            "parameters": {
                "type": "object",
                "properties": {},
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_campaign_details",
            "description": "Get detailed information about a specific campaign including funding progress, investment count, milestones, and updates.",
            "parameters": {
                "type": "object",
                "properties": {
                    "campaign_id": {
                        "type": "integer",
                        "description": "The ID of the campaign to look up",
                    },
                },
                "required": ["campaign_id"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_my_investments",
            "description": "Get investment records. Investors see their own investments, founders see investments in their campaigns, admins see all.",
            "parameters": {
                "type": "object",
                "properties": {},
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_my_tasks",
            "description": "Get kanban board tasks assigned to the current user across all startups.",
            "parameters": {
                "type": "object",
                "properties": {},
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_platform_stats",
            "description": "Get dashboard statistics based on user's role. Admins get platform-wide stats, founders get startup stats, investors get portfolio stats.",
            "parameters": {
                "type": "object",
                "properties": {},
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "search_campaigns",
            "description": "Search active campaigns by title or description keyword.",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "The search keyword to find matching campaigns",
                    },
                },
                "required": ["query"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_notifications_summary",
            "description": "Get the user's unread notification count and most recent unread notifications.",
            "parameters": {
                "type": "object",
                "properties": {},
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_campaign_milestones",
            "description": "Get all milestones for a specific campaign with their completion status.",
            "parameters": {
                "type": "object",
                "properties": {
                    "campaign_id": {
                        "type": "integer",
                        "description": "The ID of the campaign",
                    },
                },
                "required": ["campaign_id"],
            },
        },
    },
]


# ---------------------------------------------------------------------------
# Tool registry and executor
# ---------------------------------------------------------------------------

TOOL_REGISTRY = {
    "get_my_profile": get_my_profile,
    "get_my_startups": get_my_startups,
    "get_startup_details": get_startup_details,
    "get_my_campaigns": get_my_campaigns,
    "get_campaign_details": get_campaign_details,
    "get_my_investments": get_my_investments,
    "get_my_tasks": get_my_tasks,
    "get_platform_stats": get_platform_stats,
    "search_campaigns": search_campaigns,
    "get_notifications_summary": get_notifications_summary,
    "get_campaign_milestones": get_campaign_milestones,
}


def execute_tool(tool_name, user, arguments):
    func = TOOL_REGISTRY.get(tool_name)
    if not func:
        return {"error": f"Unknown tool: {tool_name}"}
    try:
        return func(user, **arguments)
    except Exception as e:
        logger.exception("Tool execution failed: %s", tool_name)
        return {"error": str(e)}
