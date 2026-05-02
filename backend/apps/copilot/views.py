import json

from django.http import JsonResponse, StreamingHttpResponse
from django.views.decorators.csrf import csrf_exempt
from rest_framework import generics, permissions, status
from rest_framework.response import Response

from apps.core.async_auth import authenticate_async
from apps.copilot.models import CopilotConversation
from apps.copilot.serializers import (
    CopilotConversationDetailSerializer,
    CopilotConversationListSerializer,
)
from apps.copilot.stream_service import continue_from_tool_result, stream_conversation


class ConversationListCreateView(generics.ListCreateAPIView):
    serializer_class = CopilotConversationListSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return CopilotConversation.objects.filter(
            user=self.request.user
        ).prefetch_related("messages")

    def create(self, request, *args, **kwargs):
        conversation = CopilotConversation.objects.create(user=request.user)
        return Response(
            CopilotConversationListSerializer(conversation).data,
            status=status.HTTP_201_CREATED,
        )


class ConversationDetailView(generics.RetrieveDestroyAPIView):
    serializer_class = CopilotConversationDetailSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return CopilotConversation.objects.filter(user=self.request.user)


@csrf_exempt
async def stream_message_view(request, conversation_pk):
    await authenticate_async(request)
    if not request.user.is_authenticated:
        return JsonResponse({"error": "Unauthorized"}, status=401)
    if request.method != "POST":
        return JsonResponse({"error": "Method not allowed"}, status=405)

    try:
        body = json.loads(request.body)
    except json.JSONDecodeError:
        return JsonResponse({"error": "Invalid JSON"}, status=400)

    content = body.get("content", "").strip()
    media_url = body.get("media_url")
    media_type = body.get("media_type")

    if not content and not media_url:
        return JsonResponse({"error": "content is required"}, status=400)

    try:
        conversation = await CopilotConversation.objects.aget(
            pk=conversation_pk, user=request.user
        )
    except CopilotConversation.DoesNotExist:
        return JsonResponse({"error": "Conversation not found"}, status=404)

    async def event_stream():
        try:
            async for event_type, data in stream_conversation(
                request.user, conversation, content, media_url, media_type
            ):
                yield f"event: {event_type}\ndata: {json.dumps(data, default=str)}\n\n"
        except Exception as exc:
            yield f"event: error\ndata: {json.dumps({'message': str(exc)})}\n\n"

    response = StreamingHttpResponse(event_stream(), content_type="text/event-stream")
    response["Cache-Control"] = "no-cache"
    response["X-Accel-Buffering"] = "no"
    return response


@csrf_exempt
async def tool_result_view(request, conversation_pk):
    await authenticate_async(request)
    if not request.user.is_authenticated:
        return JsonResponse({"error": "Unauthorized"}, status=401)
    if request.method != "POST":
        return JsonResponse({"error": "Method not allowed"}, status=405)

    try:
        body = json.loads(request.body)
    except json.JSONDecodeError:
        return JsonResponse({"error": "Invalid JSON"}, status=400)

    tool_call_id = body.get("tool_call_id", "")
    answers = body.get("answers", {})

    if not tool_call_id:
        return JsonResponse({"error": "tool_call_id is required"}, status=400)

    try:
        conversation = await CopilotConversation.objects.aget(
            pk=conversation_pk, user=request.user
        )
    except CopilotConversation.DoesNotExist:
        return JsonResponse({"error": "Conversation not found"}, status=404)

    async def event_stream():
        try:
            async for event_type, data in continue_from_tool_result(
                request.user, conversation, tool_call_id, answers
            ):
                yield f"event: {event_type}\ndata: {json.dumps(data, default=str)}\n\n"
        except Exception as exc:
            yield f"event: error\ndata: {json.dumps({'message': str(exc)})}\n\n"

    response = StreamingHttpResponse(event_stream(), content_type="text/event-stream")
    response["Cache-Control"] = "no-cache"
    response["X-Accel-Buffering"] = "no"
    return response


@csrf_exempt
async def upload_media_view(request):
    await authenticate_async(request)
    if not request.user.is_authenticated:
        return JsonResponse({"error": "Unauthorized"}, status=401)
    if request.method != "POST":
        return JsonResponse({"error": "Method not allowed"}, status=405)

    file = request.FILES.get("file")
    if not file:
        return JsonResponse({"error": "file is required"}, status=400)

    if file.size > 10 * 1024 * 1024:
        return JsonResponse({"error": "File too large (max 10MB)"}, status=400)

    ext = file.name.rsplit(".", 1)[-1].lower() if "." in file.name else ""
    media_type = "pdf" if ext == "pdf" else "image"

    import uuid
    from asgiref.sync import sync_to_async
    from apps.copilot.storage import upload_to_supabase

    file_bytes = await sync_to_async(file.read)()
    path = f"{request.user.id}/{uuid.uuid4()}.{ext}"
    url = await sync_to_async(upload_to_supabase)(file_bytes, file.name, "copilot-media", path)

    return JsonResponse({
        "url": url,
        "media_type": media_type,
        "filename": file.name,
        "size_bytes": file.size,
    })
