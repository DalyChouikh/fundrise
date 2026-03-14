from django.contrib import admin

from .models import Investment


@admin.register(Investment)
class InvestmentAdmin(admin.ModelAdmin):
    list_display = ("investor", "campaign", "amount", "status", "created_at")
    list_filter = ("status",)
    search_fields = ("investor__full_name", "campaign__title")
    readonly_fields = ("created_at", "updated_at")
