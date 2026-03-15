from django.urls import include, path
from rest_framework.routers import DefaultRouter

from apps.campaigns import views

router = DefaultRouter()
router.register(r"", views.CampaignViewSet, basename="campaign")

urlpatterns = [
    path(
        "<int:campaign_pk>/updates/",
        views.CampaignUpdateListCreateView.as_view(),
        name="campaign-update-list",
    ),
    path(
        "<int:campaign_pk>/milestones/",
        views.CampaignMilestoneListCreateView.as_view(),
        name="campaign-milestone-list",
    ),
    path(
        "<int:campaign_pk>/milestones/<int:pk>/",
        views.CampaignMilestoneDetailView.as_view(),
        name="campaign-milestone-detail",
    ),
    path(
        "<int:campaign_pk>/comments/",
        views.CampaignCommentListCreateView.as_view(),
        name="campaign-comment-list",
    ),
    path("", include(router.urls)),
]
