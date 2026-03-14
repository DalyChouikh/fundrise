from django.contrib import admin

from .models import Campaign, CampaignUpdate, CampaignMilestone


class CampaignUpdateInline(admin.TabularInline):
    model = CampaignUpdate
    extra = 0


class CampaignMilestoneInline(admin.TabularInline):
    model = CampaignMilestone
    extra = 0


@admin.register(Campaign)
class CampaignAdmin(admin.ModelAdmin):
    list_display = ("title", "startup", "funding_goal", "current_funding", "status", "deadline")
    list_filter = ("status",)
    search_fields = ("title", "description")
    readonly_fields = ("created_at", "updated_at")
    inlines = [CampaignUpdateInline, CampaignMilestoneInline]


@admin.register(CampaignUpdate)
class CampaignUpdateAdmin(admin.ModelAdmin):
    list_display = ("title", "campaign", "created_by", "created_at")
    readonly_fields = ("created_at", "updated_at")


@admin.register(CampaignMilestone)
class CampaignMilestoneAdmin(admin.ModelAdmin):
    list_display = ("title", "campaign", "target_date", "is_completed")
    list_filter = ("is_completed",)
    readonly_fields = ("created_at", "updated_at")
