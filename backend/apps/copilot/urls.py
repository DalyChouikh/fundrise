from django.urls import path

from apps.copilot import views

urlpatterns = [
    path(
        "conversations/",
        views.ConversationListCreateView.as_view(),
        name="copilot-conversation-list",
    ),
    path(
        "conversations/<uuid:pk>/",
        views.ConversationDetailView.as_view(),
        name="copilot-conversation-detail",
    ),
    path(
        "conversations/<uuid:conversation_pk>/messages/",
        views.SendMessageView.as_view(),
        name="copilot-send-message",
    ),
]
