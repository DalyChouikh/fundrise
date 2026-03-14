from django.db import models


class ChatRoom(models.Model):
    class RoomType(models.TextChoices):
        CAMPAIGN = "campaign", "Campaign"
        DIRECT = "direct", "Direct"

    room_type = models.CharField(max_length=20, choices=RoomType.choices)
    campaign = models.ForeignKey(
        "campaigns.Campaign",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="chat_rooms",
    )
    participants = models.ManyToManyField(
        "users.UserProfile",
        through="ChatRoomParticipant",
        related_name="chat_rooms",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        if self.room_type == self.RoomType.CAMPAIGN and self.campaign:
            return f"Campaign Chat: {self.campaign.title}"
        return f"Direct Chat (Room {self.pk})"


class ChatRoomParticipant(models.Model):
    room = models.ForeignKey(
        ChatRoom,
        on_delete=models.CASCADE,
        related_name="room_participants",
    )
    user = models.ForeignKey(
        "users.UserProfile",
        on_delete=models.CASCADE,
        related_name="chat_participations",
    )
    joined_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["room", "user"],
                name="unique_chat_participant",
            ),
        ]
        ordering = ["joined_at"]

    def __str__(self):
        return f"{self.user} in {self.room}"


class ChatMessage(models.Model):
    room = models.ForeignKey(
        ChatRoom,
        on_delete=models.CASCADE,
        related_name="messages",
    )
    sender = models.ForeignKey(
        "users.UserProfile",
        on_delete=models.CASCADE,
        related_name="sent_messages",
    )
    content = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at"]

    def __str__(self):
        return f"{self.sender} at {self.created_at:%Y-%m-%d %H:%M}"
