from rest_framework import generics, permissions, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from apps.notifications.models import Notification
from apps.notifications.serializers import NotificationSerializer


class NotificationListView(generics.ListAPIView):
    """GET /api/notifications/ — list user's notifications."""

    serializer_class = NotificationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Notification.objects.filter(recipient=self.request.user)


@api_view(["POST"])
@permission_classes([permissions.IsAuthenticated])
def mark_read(request, pk):
    """POST /api/notifications/{pk}/read/ — mark single notification as read."""
    try:
        notification = Notification.objects.get(pk=pk, recipient=request.user)
    except Notification.DoesNotExist:
        return Response(
            {"detail": "Notification not found."},
            status=status.HTTP_404_NOT_FOUND,
        )
    notification.is_read = True
    notification.save(update_fields=["is_read"])
    return Response({"status": "read"})


@api_view(["POST"])
@permission_classes([permissions.IsAuthenticated])
def mark_all_read(request):
    """POST /api/notifications/read-all/ — mark all notifications as read."""
    count = Notification.objects.filter(
        recipient=request.user, is_read=False
    ).update(is_read=True)
    return Response({"marked": count})


@api_view(["GET"])
@permission_classes([permissions.IsAuthenticated])
def unread_count(request):
    """GET /api/notifications/unread-count/ — count of unread notifications."""
    count = Notification.objects.filter(
        recipient=request.user, is_read=False
    ).count()
    return Response({"count": count})
