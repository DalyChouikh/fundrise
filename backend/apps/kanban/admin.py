from django.contrib import admin

from .models import KanbanColumn, KanbanTask, TaskComment


class KanbanTaskInline(admin.TabularInline):
    model = KanbanTask
    extra = 0


class TaskCommentInline(admin.TabularInline):
    model = TaskComment
    extra = 0


@admin.register(KanbanColumn)
class KanbanColumnAdmin(admin.ModelAdmin):
    list_display = ("name", "startup", "order")
    list_filter = ("startup",)
    inlines = [KanbanTaskInline]


@admin.register(KanbanTask)
class KanbanTaskAdmin(admin.ModelAdmin):
    list_display = ("title", "column", "assignee", "order", "created_at")
    search_fields = ("title", "description")
    readonly_fields = ("created_at", "updated_at")
    inlines = [TaskCommentInline]


@admin.register(TaskComment)
class TaskCommentAdmin(admin.ModelAdmin):
    list_display = ("author", "task", "created_at")
    readonly_fields = ("created_at",)
