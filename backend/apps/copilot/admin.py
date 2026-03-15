from django.contrib import admin

from apps.copilot.models import CopilotConversation, CopilotMessage


@admin.register(CopilotConversation)
class CopilotConversationAdmin(admin.ModelAdmin):
    list_display = ["id", "user", "title", "created_at"]
    list_filter = ["created_at"]
    search_fields = ["user__full_name", "title"]


@admin.register(CopilotMessage)
class CopilotMessageAdmin(admin.ModelAdmin):
    list_display = ["id", "conversation", "role", "created_at"]
    list_filter = ["role", "created_at"]
