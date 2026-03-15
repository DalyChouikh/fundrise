from django.urls import path

from apps.notifications import views

urlpatterns = [
    path("", views.NotificationListView.as_view(), name="notification-list"),
    path("<int:pk>/read/", views.mark_read, name="notification-mark-read"),
    path("read-all/", views.mark_all_read, name="notification-mark-all-read"),
    path("unread-count/", views.unread_count, name="notification-unread-count"),
]
