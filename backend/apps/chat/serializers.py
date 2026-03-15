from rest_framework import serializers

from apps.chat.models import ChatMessage, ChatRoom
from apps.users.models import UserProfile
from apps.users.serializers import UserProfileMinimalSerializer


class ChatMessageSerializer(serializers.ModelSerializer):
    sender_detail = UserProfileMinimalSerializer(source="sender", read_only=True)

    class Meta:
        model = ChatMessage
        fields = ["id", "room", "sender", "sender_detail", "content", "created_at"]
        read_only_fields = fields


class ChatRoomSerializer(serializers.ModelSerializer):
    campaign_title = serializers.CharField(
        source="campaign.title", read_only=True, default=None
    )
    participants_detail = UserProfileMinimalSerializer(
        source="participants", many=True, read_only=True
    )
    last_message = serializers.SerializerMethodField()

    class Meta:
        model = ChatRoom
        fields = [
            "id",
            "room_type",
            "campaign",
            "campaign_title",
            "participants_detail",
            "last_message",
            "created_at",
        ]
        read_only_fields = fields

    def get_last_message(self, obj):
        msg = (
            obj.messages.select_related("sender")
            .order_by("-created_at")
            .first()
        )
        if msg:
            return ChatMessageSerializer(msg).data
        return None


class DirectRoomCreateSerializer(serializers.Serializer):
    participant_id = serializers.UUIDField()

    def validate_participant_id(self, value):
        if not UserProfile.objects.filter(id=value).exists():
            raise serializers.ValidationError("User not found.")
        return value
