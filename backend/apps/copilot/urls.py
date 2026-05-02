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
        "conversations/<uuid:conversation_pk>/messages/stream/",
        views.stream_message_view,
        name="copilot-stream-message",
    ),
    path(
        "conversations/<uuid:conversation_pk>/messages/tool_result/",
        views.tool_result_view,
        name="copilot-tool-result",
    ),
    path(
        "upload/",
        views.upload_media_view,
        name="copilot-upload",
    ),
]
