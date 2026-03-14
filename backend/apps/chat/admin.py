from django.contrib import admin

from .models import ChatRoom, ChatRoomParticipant, ChatMessage


class ChatRoomParticipantInline(admin.TabularInline):
    model = ChatRoomParticipant
    extra = 0


class ChatMessageInline(admin.TabularInline):
    model = ChatMessage
    extra = 0


@admin.register(ChatRoom)
class ChatRoomAdmin(admin.ModelAdmin):
    list_display = ("pk", "room_type", "campaign", "created_at")
    list_filter = ("room_type",)
    inlines = [ChatRoomParticipantInline, ChatMessageInline]


@admin.register(ChatMessage)
class ChatMessageAdmin(admin.ModelAdmin):
    list_display = ("sender", "room", "created_at")
    readonly_fields = ("created_at",)
