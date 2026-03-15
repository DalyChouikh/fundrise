from django.db.models import Max, F
from rest_framework import generics, permissions, status
from rest_framework.pagination import LimitOffsetPagination
from rest_framework.response import Response

from apps.chat.models import ChatRoom, ChatRoomParticipant, ChatMessage
from apps.chat.serializers import (
    ChatMessageSerializer,
    ChatRoomSerializer,
    DirectRoomCreateSerializer,
)


class ChatRoomListView(generics.ListAPIView):
    serializer_class = ChatRoomSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return (
            ChatRoom.objects.filter(participants=self.request.user)
            .select_related("campaign")
            .prefetch_related("participants")
            .annotate(latest_msg=Max("messages__created_at"))
            .order_by(F("latest_msg").desc(nulls_last=True))
        )


class ChatRoomDetailView(generics.RetrieveAPIView):
    serializer_class = ChatRoomSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return (
            ChatRoom.objects.filter(participants=self.request.user)
            .select_related("campaign")
            .prefetch_related("participants")
        )


class DirectRoomCreateView(generics.CreateAPIView):
    serializer_class = DirectRoomCreateSerializer
    permission_classes = [permissions.IsAuthenticated]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        participant_id = serializer.validated_data["participant_id"]

        # Check for existing direct room between these two users
        existing = (
            ChatRoom.objects.filter(
                room_type=ChatRoom.RoomType.DIRECT,
                participants=request.user,
            )
            .filter(participants=participant_id)
            .first()
        )
        if existing:
            room = (
                ChatRoom.objects.filter(pk=existing.pk)
                .select_related("campaign")
                .prefetch_related("participants")
                .first()
            )
            return Response(
                ChatRoomSerializer(room).data, status=status.HTTP_200_OK
            )

        # Create new direct room
        room = ChatRoom.objects.create(room_type=ChatRoom.RoomType.DIRECT)
        ChatRoomParticipant.objects.bulk_create(
            [
                ChatRoomParticipant(room=room, user=request.user),
                ChatRoomParticipant(room=room, user_id=participant_id),
            ]
        )
        room = (
            ChatRoom.objects.filter(pk=room.pk)
            .select_related("campaign")
            .prefetch_related("participants")
            .first()
        )
        return Response(
            ChatRoomSerializer(room).data, status=status.HTTP_201_CREATED
        )


class MessagePagination(LimitOffsetPagination):
    default_limit = 50


class ChatMessageListView(generics.ListAPIView):
    serializer_class = ChatMessageSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = MessagePagination

    def get_queryset(self):
        return (
            ChatMessage.objects.filter(
                room_id=self.kwargs["room_pk"],
                room__participants=self.request.user,
            )
            .select_related("sender")
            .order_by("-created_at")
        )
