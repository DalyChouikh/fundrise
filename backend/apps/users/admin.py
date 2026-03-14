from django.contrib import admin

from .models import UserProfile


@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = ("full_name", "email", "role", "created_at")
    list_filter = ("role",)
    search_fields = ("full_name", "email")
    readonly_fields = ("id", "created_at", "updated_at")
