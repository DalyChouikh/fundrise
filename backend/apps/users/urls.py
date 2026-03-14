from django.urls import path

from apps.users import views

urlpatterns = [
    path("me/", views.UserProfileMeView.as_view(), name="user-me"),
]
