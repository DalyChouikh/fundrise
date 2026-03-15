from rest_framework import generics, permissions, status
from rest_framework.response import Response

from apps.copilot.models import CopilotConversation
from apps.copilot.serializers import (
    CopilotConversationDetailSerializer,
    CopilotConversationListSerializer,
    CopilotMessageSerializer,
    SendMessageSerializer,
)
from apps.copilot.services import chat_with_copilot


class ConversationListCreateView(generics.ListCreateAPIView):
    serializer_class = CopilotConversationListSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return CopilotConversation.objects.filter(
            user=self.request.user
        ).prefetch_related("messages")

    def create(self, request, *args, **kwargs):
        conversation = CopilotConversation.objects.create(user=request.user)
        serializer = CopilotConversationListSerializer(conversation)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class ConversationDetailView(generics.RetrieveDestroyAPIView):
    serializer_class = CopilotConversationDetailSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return CopilotConversation.objects.filter(user=self.request.user)


class SendMessageView(generics.CreateAPIView):
    serializer_class = SendMessageSerializer
    permission_classes = [permissions.IsAuthenticated]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        conversation = CopilotConversation.objects.filter(
            pk=self.kwargs["conversation_pk"],
            user=request.user,
        ).first()

        if not conversation:
            return Response(
                {"detail": "Conversation not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        user_message = serializer.validated_data["message"]

        # Auto-title from first message
        if not conversation.title:
            conversation.title = user_message[:100]
            conversation.save(update_fields=["title", "updated_at"])

        assistant_msg = chat_with_copilot(
            user=request.user,
            conversation=conversation,
            user_message_text=user_message,
        )

        return Response(
            CopilotMessageSerializer(assistant_msg).data,
            status=status.HTTP_201_CREATED,
        )
