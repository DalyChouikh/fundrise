from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/", include("apps.core.urls")),
    path("api/users/", include("apps.users.urls")),
    path("api/startups/", include("apps.startups.urls")),
    path("api/campaigns/", include("apps.campaigns.urls")),
    path("api/investments/", include("apps.investments.urls")),
    path("api/kanban/", include("apps.kanban.urls")),
    path("api/chat/", include("apps.chat.urls")),
    path("api/notifications/", include("apps.notifications.urls")),
    path("api/copilot/", include("apps.copilot.urls")),
]
