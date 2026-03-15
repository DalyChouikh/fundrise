from django.urls import include, path
from rest_framework.routers import DefaultRouter

from apps.investments import views

router = DefaultRouter()
router.register(r"", views.InvestmentViewSet, basename="investment")

urlpatterns = [
    path("", include(router.urls)),
]
