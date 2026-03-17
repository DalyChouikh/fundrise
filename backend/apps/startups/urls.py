from django.urls import include, path
from rest_framework.routers import DefaultRouter

from apps.startups import views

router = DefaultRouter()
router.register(r"", views.StartupViewSet, basename="startup")

urlpatterns = [
    path(
        "<int:startup_pk>/members/",
        views.StartupMemberListCreateView.as_view(),
        name="startup-member-list",
    ),
    path(
        "<int:startup_pk>/members/<int:pk>/",
        views.StartupMemberDestroyView.as_view(),
        name="startup-member-detail",
    ),
    path(
        "<int:startup_pk>/invitations/",
        views.StartupInvitationCreateView.as_view(),
        name="startup-invitation-create",
    ),
    path(
        "<int:startup_pk>/invitations/list/",
        views.StartupInvitationListView.as_view(),
        name="startup-invitation-list",
    ),
    path(
        "<int:startup_pk>/invitations/<uuid:pk>/cancel/",
        views.StartupInvitationCancelView.as_view(),
        name="startup-invitation-cancel",
    ),
    path("", include(router.urls)),
]
