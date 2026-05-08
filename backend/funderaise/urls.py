from django.contrib import admin
from django.urls import path, include

from apps.startups import views as startup_views

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/industries/", startup_views.IndustryListView.as_view(), name="industry-list"),
    path("api/invitations/<str:token>/", startup_views.InvitationPublicDetailView.as_view(), name="invitation-detail"),
    path("api/invitations/<str:token>/accept/", startup_views.InvitationAcceptView.as_view(), name="invitation-accept"),
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
