from django.contrib import admin

from .models import Startup, StartupMember, StartupFollow


class StartupMemberInline(admin.TabularInline):
    model = StartupMember
    extra = 0


@admin.register(Startup)
class StartupAdmin(admin.ModelAdmin):
    list_display = ("name", "industry", "status", "created_by", "created_at")
    list_filter = ("status", "industry")
    search_fields = ("name", "description")
    readonly_fields = ("created_at", "updated_at")
    inlines = [StartupMemberInline]


@admin.register(StartupMember)
class StartupMemberAdmin(admin.ModelAdmin):
    list_display = ("user", "startup", "role", "joined_at")
    list_filter = ("role",)


@admin.register(StartupFollow)
class StartupFollowAdmin(admin.ModelAdmin):
    list_display = ("user", "startup", "created_at")
