import logging
from decimal import Decimal, InvalidOperation

from django.db import transaction
from django.db.models import Count, F, Q, Sum
from django.utils import timezone

from apps.campaigns.models import Campaign, CampaignComment, CampaignMilestone, CampaignUpdate
from apps.investments.models import Investment
from apps.kanban.models import KanbanColumn, KanbanTask
from apps.notifications.models import Notification
from apps.notifications.utils import create_notification
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


def get_kanban_board(user, startup_id):
    if not _check_startup_member(user, startup_id):
        return {"error": "Permission denied. You must be a member of this startup."}

    columns = (
        KanbanColumn.objects.filter(startup_id=startup_id)
        .prefetch_related("tasks__assignee")
        .order_by("order")
    )
    return {
        "startup_id": startup_id,
        "columns": [
            {
                "id": col.id,
                "name": col.name,
                "order": col.order,
                "tasks": [
                    {
                        "id": t.id,
                        "title": t.title,
                        "description": (t.description or "")[:200],
                        "assignee_name": t.assignee.full_name if t.assignee else None,
                        "assignee_email": t.assignee.email if t.assignee else None,
                        "order": t.order,
                    }
                    for t in col.tasks.all()
                ],
            }
            for col in columns
        ],
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


def search_campaigns(user, query, industry=None):
    qs = Campaign.objects.filter(
        status=Campaign.Status.ACTIVE,
    ).filter(Q(title__icontains=query) | Q(description__icontains=query))
    if industry:
        qs = qs.filter(startup__industry__icontains=industry)
    campaigns = qs.select_related("startup")[:10]
    return {
        "results": [
            {
                "id": c.id,
                "title": c.title,
                "startup_name": c.startup.name,
                "startup_industry": c.startup.industry,
                "funding_goal": str(c.funding_goal),
                "current_funding": str(c.current_funding),
                "funding_percentage": c.funding_percentage,
                "deadline": str(c.deadline),
            }
            for c in campaigns
        ]
    }


def search_startups(user, query, industry=None):
    qs = Startup.objects.filter(
        Q(name__icontains=query) | Q(description__icontains=query)
    ).annotate(
        members_count=Count("members"),
        followers_count=Count("followers"),
    )
    if industry:
        qs = qs.filter(industry__icontains=industry)
    startups = qs[:10]
    return {
        "results": [
            {
                "id": s.id,
                "name": s.name,
                "industry": s.industry,
                "location": s.location,
                "status": s.status,
                "members_count": s.members_count,
                "followers_count": s.followers_count,
            }
            for s in startups
        ]
    }


def list_startups(user, industry=None, status=None):
    qs = Startup.objects.annotate(
        members_count=Count("members"),
        followers_count=Count("followers"),
    )
    if industry:
        qs = qs.filter(industry__icontains=industry)
    if status:
        qs = qs.filter(status=status)
    startups = qs[:20]
    return {
        "startups": [
            {
                "id": s.id,
                "name": s.name,
                "industry": s.industry,
                "location": s.location,
                "status": s.status,
                "members_count": s.members_count,
                "followers_count": s.followers_count,
            }
            for s in startups
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
# Helper: check startup membership
# ---------------------------------------------------------------------------


def _check_startup_member(user, startup_id):
    return StartupMember.objects.filter(startup_id=startup_id, user=user).exists()


def _check_campaign_member(user, campaign):
    return StartupMember.objects.filter(startup=campaign.startup, user=user).exists()


# ---------------------------------------------------------------------------
# Action tool implementations
# ---------------------------------------------------------------------------


def create_campaign_update(user, campaign_id, title, content):
    try:
        campaign = Campaign.objects.select_related("startup").get(id=campaign_id)
    except Campaign.DoesNotExist:
        return {"error": "Campaign not found"}

    if not _check_campaign_member(user, campaign):
        return {"error": "Permission denied. You must be a member of the campaign's startup."}

    update = CampaignUpdate.objects.create(
        campaign=campaign, title=title, content=content, created_by=user
    )
    return {
        "success": True,
        "update_id": update.id,
        "title": update.title,
        "campaign_title": campaign.title,
    }


def create_campaign_milestone(user, campaign_id, title, description, target_date):
    try:
        campaign = Campaign.objects.select_related("startup").get(id=campaign_id)
    except Campaign.DoesNotExist:
        return {"error": "Campaign not found"}

    if not _check_campaign_member(user, campaign):
        return {"error": "Permission denied. You must be a member of the campaign's startup."}

    milestone = CampaignMilestone.objects.create(
        campaign=campaign, title=title, description=description, target_date=target_date
    )
    return {
        "success": True,
        "milestone_id": milestone.id,
        "title": milestone.title,
        "target_date": str(milestone.target_date),
        "campaign_title": campaign.title,
    }


def toggle_milestone_completed(user, milestone_id):
    try:
        milestone = CampaignMilestone.objects.select_related("campaign__startup").get(id=milestone_id)
    except CampaignMilestone.DoesNotExist:
        return {"error": "Milestone not found"}

    if not _check_campaign_member(user, milestone.campaign):
        return {"error": "Permission denied. You must be a member of the campaign's startup."}

    milestone.is_completed = not milestone.is_completed
    milestone.completed_at = timezone.now() if milestone.is_completed else None
    milestone.save(update_fields=["is_completed", "completed_at", "updated_at"])
    return {
        "success": True,
        "milestone_id": milestone.id,
        "title": milestone.title,
        "is_completed": milestone.is_completed,
    }


def create_kanban_column(user, startup_id, name):
    if not _check_startup_member(user, startup_id):
        return {"error": "Permission denied. You must be a member of this startup."}

    max_order = (
        KanbanColumn.objects.filter(startup_id=startup_id)
        .order_by("-order")
        .values_list("order", flat=True)
        .first()
    )
    column = KanbanColumn.objects.create(
        startup_id=startup_id, name=name, order=(max_order or 0) + 1
    )
    return {"success": True, "column_id": column.id, "name": column.name, "order": column.order}


def create_kanban_task(user, startup_id, column_id, title, description="", assignee_email=None):
    if not _check_startup_member(user, startup_id):
        return {"error": "Permission denied. You must be a member of this startup."}

    try:
        column = KanbanColumn.objects.get(id=column_id, startup_id=startup_id)
    except KanbanColumn.DoesNotExist:
        return {"error": "Column not found in this startup."}

    max_order = (
        KanbanTask.objects.filter(column=column)
        .order_by("-order")
        .values_list("order", flat=True)
        .first()
    )

    assignee = None
    if assignee_email:
        from apps.users.models import UserProfile
        try:
            assignee = UserProfile.objects.get(email=assignee_email)
        except UserProfile.DoesNotExist:
            return {"error": f"User with email '{assignee_email}' not found."}

    task = KanbanTask.objects.create(
        column=column,
        title=title,
        description=description,
        assignee=assignee,
        order=(max_order or 0) + 1,
        created_by=user,
    )

    if assignee and assignee != user:
        create_notification(
            recipient=assignee,
            notification_type="task_assigned",
            title="New Task Assigned",
            message=f"You have been assigned to '{task.title}'.",
            related_object=task,
        )

    return {
        "success": True,
        "task_id": task.id,
        "title": task.title,
        "column_name": column.name,
        "assignee": assignee.full_name if assignee else None,
    }


def move_kanban_task(user, startup_id, task_id, column_id):
    if not _check_startup_member(user, startup_id):
        return {"error": "Permission denied. You must be a member of this startup."}

    try:
        task = KanbanTask.objects.select_related("column").get(id=task_id, column__startup_id=startup_id)
    except KanbanTask.DoesNotExist:
        return {"error": "Task not found in this startup."}

    try:
        new_column = KanbanColumn.objects.get(id=column_id, startup_id=startup_id)
    except KanbanColumn.DoesNotExist:
        return {"error": "Target column not found in this startup."}

    max_order = (
        KanbanTask.objects.filter(column=new_column)
        .order_by("-order")
        .values_list("order", flat=True)
        .first()
    )
    task.column = new_column
    task.order = (max_order or 0) + 1
    task.save(update_fields=["column", "order", "updated_at"])

    return {
        "success": True,
        "task_id": task.id,
        "title": task.title,
        "moved_to": new_column.name,
    }


def update_kanban_task(user, startup_id, task_id, title=None, description=None, assignee_email=None):
    if not _check_startup_member(user, startup_id):
        return {"error": "Permission denied. You must be a member of this startup."}

    try:
        task = KanbanTask.objects.select_related("column").get(id=task_id, column__startup_id=startup_id)
    except KanbanTask.DoesNotExist:
        return {"error": "Task not found in this startup."}

    update_fields = ["updated_at"]
    if title is not None:
        task.title = title
        update_fields.append("title")
    if description is not None:
        task.description = description
        update_fields.append("description")
    if assignee_email is not None:
        from apps.users.models import UserProfile
        if assignee_email == "":
            task.assignee = None
            update_fields.append("assignee")
        else:
            try:
                new_assignee = UserProfile.objects.get(email=assignee_email)
            except UserProfile.DoesNotExist:
                return {"error": f"User with email '{assignee_email}' not found."}
            old_assignee = task.assignee
            task.assignee = new_assignee
            update_fields.append("assignee")
            if new_assignee != user and new_assignee != old_assignee:
                create_notification(
                    recipient=new_assignee,
                    notification_type="task_assigned",
                    title="Task Assigned",
                    message=f"You have been assigned to '{task.title}'.",
                    related_object=task,
                )

    task.save(update_fields=update_fields)
    return {
        "success": True,
        "task_id": task.id,
        "title": task.title,
        "description": task.description[:200],
        "assignee": task.assignee.full_name if task.assignee else None,
    }


def delete_kanban_task(user, startup_id, task_id):
    if not _check_startup_member(user, startup_id):
        return {"error": "Permission denied. You must be a member of this startup."}

    try:
        task = KanbanTask.objects.get(id=task_id, column__startup_id=startup_id)
    except KanbanTask.DoesNotExist:
        return {"error": "Task not found in this startup."}

    task_title = task.title
    task.delete()
    return {"success": True, "deleted_task": task_title}


def delete_kanban_column(user, startup_id, column_id):
    if not _check_startup_member(user, startup_id):
        return {"error": "Permission denied. You must be a member of this startup."}

    try:
        column = KanbanColumn.objects.get(id=column_id, startup_id=startup_id)
    except KanbanColumn.DoesNotExist:
        return {"error": "Column not found in this startup."}

    column_name = column.name
    task_count = column.tasks.count()
    column.delete()
    return {"success": True, "deleted_column": column_name, "tasks_deleted": task_count}


def confirm_investment(user, investment_id):
    try:
        investment = Investment.objects.select_related("campaign__startup", "investor").get(id=investment_id)
    except Investment.DoesNotExist:
        return {"error": "Investment not found"}

    is_founder = StartupMember.objects.filter(
        startup=investment.campaign.startup,
        user=user,
        role=StartupMember.Role.FOUNDER,
    ).exists()
    if not is_founder:
        return {"error": "Permission denied. Only the startup founder can confirm investments."}

    if investment.status != Investment.Status.PENDING:
        return {"error": "Only pending investments can be confirmed."}

    with transaction.atomic():
        investment.status = Investment.Status.CONFIRMED
        investment.save(update_fields=["status", "updated_at"])
        Campaign.objects.filter(pk=investment.campaign_id).update(
            current_funding=F("current_funding") + investment.amount
        )

    create_notification(
        recipient=investment.investor,
        notification_type="investment_confirmed",
        title="Investment Confirmed",
        message=f"Your ${investment.amount} investment in {investment.campaign.title} has been confirmed.",
        related_object=investment,
    )
    return {
        "success": True,
        "investment_id": investment.id,
        "amount": str(investment.amount),
        "campaign_title": investment.campaign.title,
        "investor": investment.investor.full_name,
    }


def cancel_investment(user, investment_id):
    try:
        investment = Investment.objects.select_related("campaign__startup", "investor").get(id=investment_id)
    except Investment.DoesNotExist:
        return {"error": "Investment not found"}

    is_owner = investment.investor == user
    is_admin = user.role == "admin"
    is_founder = StartupMember.objects.filter(
        startup=investment.campaign.startup,
        user=user,
        role=StartupMember.Role.FOUNDER,
    ).exists()

    if not (is_owner or is_admin or is_founder):
        return {"error": "Permission denied. Only the investor, startup founder, or admin can cancel."}

    if investment.status != Investment.Status.PENDING:
        return {"error": "Only pending investments can be cancelled."}

    investment.status = Investment.Status.CANCELLED
    investment.save(update_fields=["status", "updated_at"])
    return {
        "success": True,
        "investment_id": investment.id,
        "amount": str(investment.amount),
        "campaign_title": investment.campaign.title,
    }


def create_investment(user, campaign_id, amount):
    if user.role != "investor":
        return {"error": "Permission denied. Only investors can create investments."}

    try:
        amount_decimal = Decimal(str(amount))
        if amount_decimal <= 0:
            return {"error": "Investment amount must be greater than zero."}
    except (InvalidOperation, ValueError):
        return {"error": "Invalid amount."}

    try:
        campaign = Campaign.objects.select_related("startup").get(id=campaign_id)
    except Campaign.DoesNotExist:
        return {"error": "Campaign not found"}

    if campaign.status != Campaign.Status.ACTIVE:
        return {"error": "Can only invest in active campaigns."}

    investment = Investment.objects.create(
        investor=user, campaign=campaign, amount=amount_decimal
    )

    # Notify startup founders
    founders = StartupMember.objects.filter(
        startup=campaign.startup, role=StartupMember.Role.FOUNDER
    ).select_related("user")
    for founder_member in founders:
        if founder_member.user != user:
            create_notification(
                recipient=founder_member.user,
                notification_type="investment_received",
                title="New Investment",
                message=f"{user.full_name} invested ${amount_decimal} in {campaign.title}.",
                related_object=investment,
            )

    return {
        "success": True,
        "investment_id": investment.id,
        "amount": str(investment.amount),
        "campaign_title": campaign.title,
        "status": "pending",
    }


def follow_startup(user, startup_id):
    try:
        startup = Startup.objects.get(id=startup_id)
    except Startup.DoesNotExist:
        return {"error": "Startup not found"}

    follow_obj, created = StartupFollow.objects.get_or_create(startup=startup, user=user)
    if not created:
        follow_obj.delete()
        return {"success": True, "following": False, "startup_name": startup.name}

    if startup.created_by != user:
        create_notification(
            recipient=startup.created_by,
            notification_type="new_follower",
            title="New Follower",
            message=f"{user.full_name} started following {startup.name}.",
            related_object=startup,
        )
    return {"success": True, "following": True, "startup_name": startup.name}


def post_campaign_comment(user, campaign_id, content, parent_id=None):
    try:
        campaign = Campaign.objects.get(id=campaign_id)
    except Campaign.DoesNotExist:
        return {"error": "Campaign not found"}

    parent = None
    if parent_id:
        try:
            parent = CampaignComment.objects.get(id=parent_id, campaign=campaign)
        except CampaignComment.DoesNotExist:
            return {"error": "Parent comment not found"}
        if parent.parent is not None:
            return {"error": "Cannot reply to a reply. Only one level of nesting is allowed."}

    comment = CampaignComment.objects.create(
        campaign=campaign, author=user, content=content, parent=parent
    )
    return {
        "success": True,
        "comment_id": comment.id,
        "campaign_title": campaign.title,
        "is_reply": parent is not None,
    }


def mark_notifications_read(user):
    count = Notification.objects.filter(recipient=user, is_read=False).update(is_read=True)
    return {"success": True, "marked_read": count}


def update_my_profile(user, full_name=None, bio=None):
    update_fields = []
    if full_name is not None:
        user.full_name = full_name
        update_fields.append("full_name")
    if bio is not None:
        user.bio = bio
        update_fields.append("bio")

    if not update_fields:
        return {"error": "No fields to update. Provide full_name or bio."}

    user.save(update_fields=update_fields)
    return {
        "success": True,
        "full_name": user.full_name,
        "bio": user.bio,
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
            "name": "get_kanban_board",
            "description": "Get the full kanban board for a startup, including all columns and tasks with their IDs, titles, and assignees. Use this to look up column_id and task_id before creating, moving, or updating tasks.",
            "parameters": {
                "type": "object",
                "properties": {
                    "startup_id": {
                        "type": "integer",
                        "description": "The ID of the startup whose kanban board to retrieve",
                    },
                },
                "required": ["startup_id"],
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
            "description": "Search active campaigns by title or description keyword. Optionally filter by industry.",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "The search keyword to find matching campaigns",
                    },
                    "industry": {
                        "type": "string",
                        "description": "Optional industry filter (e.g. 'FinTech', 'HealthTech'). Case-insensitive contains match.",
                    },
                },
                "required": ["query"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "search_startups",
            "description": "Search startups by name or description keyword. Optionally filter by industry.",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "Keyword to search in startup name and description",
                    },
                    "industry": {
                        "type": "string",
                        "description": "Optional industry filter (e.g. 'FinTech'). Case-insensitive contains match.",
                    },
                },
                "required": ["query"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "list_startups",
            "description": "List and browse startups, optionally filtered by industry or status. Use when an investor asks to discover startups by category or status without a specific search keyword.",
            "parameters": {
                "type": "object",
                "properties": {
                    "industry": {
                        "type": "string",
                        "description": "Filter by industry (e.g. 'FinTech'). Optional.",
                    },
                    "status": {
                        "type": "string",
                        "description": "Filter by status: 'active', 'pending_approval', or 'suspended'. Optional.",
                    },
                },
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
    # ----- Action tools -----
    {
        "type": "function",
        "function": {
            "name": "create_campaign_update",
            "description": "Create a new update/announcement for a campaign. Only startup members can do this.",
            "parameters": {
                "type": "object",
                "properties": {
                    "campaign_id": {
                        "type": "integer",
                        "description": "The ID of the campaign",
                    },
                    "title": {
                        "type": "string",
                        "description": "Title of the update",
                    },
                    "content": {
                        "type": "string",
                        "description": "Content/body of the update",
                    },
                },
                "required": ["campaign_id", "title", "content"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "create_campaign_milestone",
            "description": "Add a new milestone to a campaign. Only startup members can do this.",
            "parameters": {
                "type": "object",
                "properties": {
                    "campaign_id": {
                        "type": "integer",
                        "description": "The ID of the campaign",
                    },
                    "title": {
                        "type": "string",
                        "description": "Title of the milestone",
                    },
                    "description": {
                        "type": "string",
                        "description": "Description of the milestone",
                    },
                    "target_date": {
                        "type": "string",
                        "description": "Target date in YYYY-MM-DD format",
                    },
                },
                "required": ["campaign_id", "title", "description", "target_date"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "toggle_milestone_completed",
            "description": "Toggle a milestone's completion status (mark as completed or uncompleted). Only startup members can do this.",
            "parameters": {
                "type": "object",
                "properties": {
                    "milestone_id": {
                        "type": "integer",
                        "description": "The ID of the milestone",
                    },
                },
                "required": ["milestone_id"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "create_kanban_column",
            "description": "Create a new column/list on a startup's kanban board. Only startup members can do this.",
            "parameters": {
                "type": "object",
                "properties": {
                    "startup_id": {
                        "type": "integer",
                        "description": "The ID of the startup",
                    },
                    "name": {
                        "type": "string",
                        "description": "Name of the column (e.g. 'To Do', 'In Progress', 'Done')",
                    },
                },
                "required": ["startup_id", "name"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "create_kanban_task",
            "description": "Create a new task on a startup's kanban board. Only startup members can do this.",
            "parameters": {
                "type": "object",
                "properties": {
                    "startup_id": {
                        "type": "integer",
                        "description": "The ID of the startup",
                    },
                    "column_id": {
                        "type": "integer",
                        "description": "The ID of the column to add the task to",
                    },
                    "title": {
                        "type": "string",
                        "description": "Title of the task",
                    },
                    "description": {
                        "type": "string",
                        "description": "Description of the task",
                    },
                    "assignee_email": {
                        "type": "string",
                        "description": "Email of the user to assign the task to (optional)",
                    },
                },
                "required": ["startup_id", "column_id", "title"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "move_kanban_task",
            "description": "Move a task to a different column on the kanban board. Only startup members can do this.",
            "parameters": {
                "type": "object",
                "properties": {
                    "startup_id": {
                        "type": "integer",
                        "description": "The ID of the startup",
                    },
                    "task_id": {
                        "type": "integer",
                        "description": "The ID of the task to move",
                    },
                    "column_id": {
                        "type": "integer",
                        "description": "The ID of the target column",
                    },
                },
                "required": ["startup_id", "task_id", "column_id"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "update_kanban_task",
            "description": "Update a task's details (title, description, assignee). Only startup members can do this.",
            "parameters": {
                "type": "object",
                "properties": {
                    "startup_id": {
                        "type": "integer",
                        "description": "The ID of the startup",
                    },
                    "task_id": {
                        "type": "integer",
                        "description": "The ID of the task to update",
                    },
                    "title": {
                        "type": "string",
                        "description": "New title for the task (optional)",
                    },
                    "description": {
                        "type": "string",
                        "description": "New description for the task (optional)",
                    },
                    "assignee_email": {
                        "type": "string",
                        "description": "Email of the new assignee, or empty string to unassign (optional)",
                    },
                },
                "required": ["startup_id", "task_id"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "delete_kanban_task",
            "description": "Delete a task from the kanban board. Only startup members can do this.",
            "parameters": {
                "type": "object",
                "properties": {
                    "startup_id": {
                        "type": "integer",
                        "description": "The ID of the startup",
                    },
                    "task_id": {
                        "type": "integer",
                        "description": "The ID of the task to delete",
                    },
                },
                "required": ["startup_id", "task_id"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "delete_kanban_column",
            "description": "Delete a column and all its tasks from the kanban board. Only startup members can do this.",
            "parameters": {
                "type": "object",
                "properties": {
                    "startup_id": {
                        "type": "integer",
                        "description": "The ID of the startup",
                    },
                    "column_id": {
                        "type": "integer",
                        "description": "The ID of the column to delete",
                    },
                },
                "required": ["startup_id", "column_id"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "confirm_investment",
            "description": "Confirm a pending investment. Only the startup founder can do this. Updates campaign funding.",
            "parameters": {
                "type": "object",
                "properties": {
                    "investment_id": {
                        "type": "integer",
                        "description": "The ID of the investment to confirm",
                    },
                },
                "required": ["investment_id"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "cancel_investment",
            "description": "Cancel a pending investment. Can be done by the investor, startup founder, or admin.",
            "parameters": {
                "type": "object",
                "properties": {
                    "investment_id": {
                        "type": "integer",
                        "description": "The ID of the investment to cancel",
                    },
                },
                "required": ["investment_id"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "create_investment",
            "description": "Create a new investment in a campaign. Only investors can do this. The investment starts as pending.",
            "parameters": {
                "type": "object",
                "properties": {
                    "campaign_id": {
                        "type": "integer",
                        "description": "The ID of the campaign to invest in",
                    },
                    "amount": {
                        "type": "number",
                        "description": "The investment amount in dollars",
                    },
                },
                "required": ["campaign_id", "amount"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "follow_startup",
            "description": "Toggle follow/unfollow on a startup. If already following, unfollows. If not following, follows.",
            "parameters": {
                "type": "object",
                "properties": {
                    "startup_id": {
                        "type": "integer",
                        "description": "The ID of the startup to follow/unfollow",
                    },
                },
                "required": ["startup_id"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "post_campaign_comment",
            "description": "Post a comment on a campaign's discussion. Any authenticated user can do this.",
            "parameters": {
                "type": "object",
                "properties": {
                    "campaign_id": {
                        "type": "integer",
                        "description": "The ID of the campaign",
                    },
                    "content": {
                        "type": "string",
                        "description": "The comment text",
                    },
                    "parent_id": {
                        "type": "integer",
                        "description": "ID of the parent comment to reply to (optional, only 1-level nesting)",
                    },
                },
                "required": ["campaign_id", "content"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "mark_notifications_read",
            "description": "Mark all unread notifications as read for the current user.",
            "parameters": {
                "type": "object",
                "properties": {},
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "update_my_profile",
            "description": "Update the current user's profile. Can change full_name and/or bio.",
            "parameters": {
                "type": "object",
                "properties": {
                    "full_name": {
                        "type": "string",
                        "description": "New display name (optional)",
                    },
                    "bio": {
                        "type": "string",
                        "description": "New bio text (optional)",
                    },
                },
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
    "search_startups": search_startups,
    "list_startups": list_startups,
    "get_notifications_summary": get_notifications_summary,
    "get_campaign_milestones": get_campaign_milestones,
    "get_kanban_board": get_kanban_board,
    # Action tools
    "create_campaign_update": create_campaign_update,
    "create_campaign_milestone": create_campaign_milestone,
    "toggle_milestone_completed": toggle_milestone_completed,
    "create_kanban_column": create_kanban_column,
    "create_kanban_task": create_kanban_task,
    "move_kanban_task": move_kanban_task,
    "update_kanban_task": update_kanban_task,
    "delete_kanban_task": delete_kanban_task,
    "delete_kanban_column": delete_kanban_column,
    "confirm_investment": confirm_investment,
    "cancel_investment": cancel_investment,
    "create_investment": create_investment,
    "follow_startup": follow_startup,
    "post_campaign_comment": post_campaign_comment,
    "mark_notifications_read": mark_notifications_read,
    "update_my_profile": update_my_profile,
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
