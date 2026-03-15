from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncJsonWebsocketConsumer

from apps.chat.models import ChatMessage, ChatRoomParticipant
from apps.notifications.utils import create_notification


class ChatConsumer(AsyncJsonWebsocketConsumer):
    async def connect(self):
        self.room_id = self.scope["url_route"]["kwargs"]["room_id"]
        self.group_name = f"chat_{self.room_id}"
        self.user = self.scope.get("user")

        if self.user is None:
            await self.close()
            return

        is_participant = await self._is_participant()
        if not is_participant:
            await self.close()
            return

        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        if hasattr(self, "group_name"):
            await self.channel_layer.group_discard(
                self.group_name, self.channel_name
            )

    async def receive_json(self, content):
        msg_type = content.get("type")
        if msg_type != "chat_message":
            return

        text = (content.get("content") or "").strip()
        if not text:
            return

        message_data = await self._save_message(text)
        await self.channel_layer.group_send(
            self.group_name,
            {"type": "chat_message", "message": message_data},
        )
        await self._notify_participants(text)

    async def chat_message(self, event):
        await self.send_json(event["message"])

    @database_sync_to_async
    def _is_participant(self):
        return ChatRoomParticipant.objects.filter(
            room_id=self.room_id, user=self.user
        ).exists()

    @database_sync_to_async
    def _save_message(self, text):
        msg = ChatMessage.objects.create(
            room_id=self.room_id,
            sender=self.user,
            content=text,
        )
        return {
            "id": msg.id,
            "room": msg.room_id,
            "sender": str(msg.sender_id),
            "sender_detail": {
                "id": str(self.user.id),
                "full_name": self.user.full_name or "",
                "avatar_url": self.user.avatar_url or "",
                "role": self.user.role,
            },
            "content": msg.content,
            "created_at": msg.created_at.isoformat(),
        }

    @database_sync_to_async
    def _notify_participants(self, text):
        participants = (
            ChatRoomParticipant.objects.filter(room_id=self.room_id)
            .exclude(user=self.user)
            .select_related("user", "room")
        )
        preview = text[:100] + ("..." if len(text) > 100 else "")
        sender_name = self.user.full_name or "Someone"
        for p in participants:
            create_notification(
                recipient=p.user,
                notification_type="new_message",
                title="New Message",
                message=f"{sender_name}: {preview}",
                related_object=p.room,
            )
