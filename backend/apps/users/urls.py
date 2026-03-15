from django.urls import path

from apps.users import views

urlpatterns = [
    path("me/", views.UserProfileMeView.as_view(), name="user-me"),
    path("search/", views.UserSearchView.as_view(), name="user-search"),
    path("", views.UserListView.as_view(), name="user-list"),
    path("<uuid:pk>/", views.UserDetailView.as_view(), name="user-detail"),
]
