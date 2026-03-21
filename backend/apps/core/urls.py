from django.urls import path
from . import views

urlpatterns = [
    path("health/", views.health_check, name="health-check"),
    path("dashboard/stats/", views.dashboard_stats, name="dashboard-stats"),
    path("dashboard/analytics/", views.dashboard_analytics, name="dashboard-analytics"),
]
