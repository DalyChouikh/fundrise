from django.urls import path

from apps.chat import views

urlpatterns = [
    path("rooms/", views.ChatRoomListView.as_view(), name="chat-room-list"),
    path("rooms/<int:pk>/", views.ChatRoomDetailView.as_view(), name="chat-room-detail"),
    path("rooms/direct/", views.DirectRoomCreateView.as_view(), name="chat-room-direct"),
    path("rooms/<int:room_pk>/messages/", views.ChatMessageListView.as_view(), name="chat-message-list"),
]
