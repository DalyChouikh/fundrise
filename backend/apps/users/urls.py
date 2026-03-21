from django.urls import path

from apps.users import views

urlpatterns = [
    path("me/", views.UserProfileMeView.as_view(), name="user-me"),
    path("me/delete/", views.DeleteAccountView.as_view(), name="delete-account"),
    path("me/investor-profile/", views.InvestorProfileView.as_view(), name="investor-profile"),
    path("me/complete-onboarding/", views.CompleteOnboardingView.as_view(), name="complete-onboarding"),
    path("search/", views.UserSearchView.as_view(), name="user-search"),
    path("", views.UserListView.as_view(), name="user-list"),
    path("<uuid:pk>/approve/", views.UserApproveView.as_view(), name="user-approve"),
    path("<uuid:pk>/reject/", views.UserRejectView.as_view(), name="user-reject"),
    path("<uuid:pk>/", views.UserDetailView.as_view(), name="user-detail"),
]
