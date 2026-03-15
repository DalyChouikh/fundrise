from apps.notifications.models import Notification


def create_notification(
    recipient,
    notification_type: str,
    title: str,
    message: str,
    related_object=None,
):
    """Create a notification for a user. Skips if recipient is the actor."""
    from django.contrib.contenttypes.models import ContentType

    kwargs = {
        "recipient": recipient,
        "notification_type": notification_type,
        "title": title,
        "message": message,
    }
    if related_object is not None:
        kwargs["related_content_type"] = ContentType.objects.get_for_model(
            related_object
        )
        kwargs["related_object_id"] = str(related_object.pk)

    return Notification.objects.create(**kwargs)
