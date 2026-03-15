from rest_framework import serializers

from apps.copilot.models import CopilotConversation, CopilotMessage


class CopilotMessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = CopilotMessage
        fields = ["id", "role", "content", "created_at"]
        read_only_fields = fields


class CopilotConversationListSerializer(serializers.ModelSerializer):
    last_message = serializers.SerializerMethodField()

    class Meta:
        model = CopilotConversation
        fields = ["id", "title", "last_message", "created_at", "updated_at"]
        read_only_fields = fields

    def get_last_message(self, obj):
        msg = (
            obj.messages.filter(role__in=["user", "assistant"], tool_calls__isnull=True)
            .order_by("-created_at")
            .first()
        )
        if msg:
            return CopilotMessageSerializer(msg).data
        return None


class CopilotConversationDetailSerializer(serializers.ModelSerializer):
    messages = serializers.SerializerMethodField()

    class Meta:
        model = CopilotConversation
        fields = ["id", "title", "messages", "created_at", "updated_at"]
        read_only_fields = fields

    def get_messages(self, obj):
        msgs = (
            obj.messages.filter(
                role__in=["user", "assistant"],
                tool_calls__isnull=True,
            )
            .order_by("created_at")
        )
        return CopilotMessageSerializer(msgs, many=True).data


class SendMessageSerializer(serializers.Serializer):
    message = serializers.CharField(max_length=2000)
