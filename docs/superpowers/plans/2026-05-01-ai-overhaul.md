# AI Overhaul Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the synchronous GitHub Models copilot with a streaming-first OpenRouter system, add rich chat UI (thinking tokens, tool display, question widget, file uploads), a dedicated AI page, and document-based signup enrichment.

**Architecture:** OpenRouter via the OpenAI-compatible SDK streams SSE chunks from Django async views to the browser. A new `AIProvider` abstraction reads four env vars. The frontend `useAIStream` hook parses SSE events and drives a rewritten `AICopilotPanel`. Signup onboarding gains required document upload steps that extract fields using the vision/text model.

**Tech Stack:** Django 5.1 async views, `StreamingHttpResponse`, `openai` SDK (already installed), `pdfplumber` (new), React 18, TypeScript, Fetch Streaming API, Supabase Storage REST API.

---

## File Map

### Phase 1 — AI Infrastructure & Streaming
| Action | Path |
|---|---|
| Create | `backend/apps/copilot/provider.py` |
| Create | `backend/apps/copilot/stream_service.py` |
| Delete | `backend/apps/copilot/services.py` |
| Modify | `backend/apps/copilot/models.py` |
| Modify | `backend/apps/copilot/views.py` |
| Modify | `backend/apps/copilot/urls.py` |
| Modify | `backend/funderaise/settings.py` |
| Modify | `backend/requirements.txt` |
| Modify | `.env.example` |
| Create | `backend/apps/copilot/tests/test_provider.py` |
| Create | `frontend/src/hooks/useAIStream.ts` |
| Modify | `frontend/src/types/index.ts` |

### Phase 2 — Chat UI Overhaul
| Action | Path |
|---|---|
| Create | `frontend/src/components/copilot/ThinkingBlock.tsx` |
| Create | `frontend/src/components/copilot/ToolCallBlock.tsx` |
| Create | `frontend/src/components/copilot/MediaPreview.tsx` |
| Create | `frontend/src/components/copilot/FileUploadZone.tsx` |
| Create | `frontend/src/components/copilot/ExamplePrompts.tsx` |
| Rewrite | `frontend/src/components/copilot/AICopilotPanel.tsx` |
| Modify | `backend/apps/copilot/views.py` (add upload view) |
| Modify | `backend/apps/copilot/urls.py` |

### Phase 3 — Question Widget
| Action | Path |
|---|---|
| Modify | `backend/apps/copilot/tools.py` |
| Modify | `backend/apps/copilot/views.py` (add tool result view) |
| Modify | `backend/apps/copilot/urls.py` |
| Create | `frontend/src/components/copilot/QuestionForm.tsx` |
| Modify | `frontend/src/hooks/useAIStream.ts` |
| Modify | `frontend/src/components/copilot/AICopilotPanel.tsx` |

### Phase 4 — AI Page & Sidebar
| Action | Path |
|---|---|
| Create | `frontend/src/pages/ai/AICopilotPage.tsx` |
| Modify | `frontend/src/App.tsx` |
| Modify | `frontend/src/components/layout/Sidebar.tsx` |

### Phase 5 — Signup Enrichment
| Action | Path |
|---|---|
| Modify | `backend/apps/users/models.py` |
| Modify | `backend/apps/startups/models.py` |
| Modify | `backend/apps/users/views.py` |
| Modify | `backend/apps/users/urls.py` |
| Create | `frontend/src/components/onboarding/DocumentUploadStep.tsx` |
| Modify | `frontend/src/pages/onboarding/OnboardingPage.tsx` |
| Modify | `frontend/src/pages/admin/UsersPage.tsx` (or user detail component) |

---

## Phase 1 — AI Infrastructure & Streaming

---

### Task 1: Update env vars and dependencies

**Files:**
- Modify: `backend/funderaise/settings.py`
- Modify: `backend/requirements.txt`
- Modify: `.env.example`

- [ ] **Step 1: Add `pdfplumber` to requirements.txt**

```
# backend/requirements.txt — add after existing openai line:
pdfplumber>=0.11,<1.0
```

- [ ] **Step 2: Replace AI settings in `backend/funderaise/settings.py`**

Find and replace the `GITHUB_MODELS_TOKEN` line:

```python
# AI Copilot (OpenRouter)
AI_API_KEY = os.environ.get("AI_API_KEY", "")
AI_BASE_URL = os.environ.get("AI_BASE_URL", "https://openrouter.ai/api/v1")
AI_MODEL = os.environ.get("AI_MODEL", "google/gemini-3.1-flash-lite-preview")
AI_VISION_MODEL = os.environ.get("AI_VISION_MODEL", "google/gemini-3.1-flash-lite-preview")
```

- [ ] **Step 3: Update `.env.example`**

Replace `GITHUB_MODELS_TOKEN=...` with:

```
# AI Copilot (OpenRouter)
AI_API_KEY=your-openrouter-api-key
AI_BASE_URL=https://openrouter.ai/api/v1
AI_MODEL=google/gemini-3.1-flash-lite-preview
AI_VISION_MODEL=google/gemini-3.1-flash-lite-preview
```

- [ ] **Step 4: Update your local `.env` file with real OpenRouter values**

- [ ] **Step 5: Rebuild the Docker container to install pdfplumber**

```bash
docker compose build django-api
```

Expected: build succeeds, `pdfplumber` listed in installed packages.

- [ ] **Step 6: Commit**

```bash
git add backend/requirements.txt backend/funderaise/settings.py .env.example
git commit -m "feat: switch AI provider to OpenRouter with configurable env vars"
```

---

### Task 2: Create `provider.py`

**Files:**
- Create: `backend/apps/copilot/provider.py`
- Create: `backend/apps/copilot/tests/__init__.py`
- Create: `backend/apps/copilot/tests/test_provider.py`

- [ ] **Step 1: Create the tests directory and write a failing test**

```bash
mkdir -p backend/apps/copilot/tests
touch backend/apps/copilot/tests/__init__.py
```

```python
# backend/apps/copilot/tests/test_provider.py
from django.test import TestCase, override_settings


@override_settings(
    AI_API_KEY="test-key",
    AI_BASE_URL="https://openrouter.ai/api/v1",
    AI_MODEL="google/gemini-3.1-flash-lite-preview",
    AI_VISION_MODEL="google/gemini-3.1-flash-lite-preview",
)
class AIProviderTest(TestCase):
    def test_provider_uses_correct_models(self):
        from apps.copilot.provider import AIProvider
        p = AIProvider()
        self.assertEqual(p.model, "google/gemini-3.1-flash-lite-preview")
        self.assertEqual(p.vision_model, "google/gemini-3.1-flash-lite-preview")

    def test_provider_uses_vision_model_when_flagged(self):
        from apps.copilot.provider import AIProvider
        p = AIProvider()
        self.assertEqual(p._select_model(use_vision=True), p.vision_model)
        self.assertEqual(p._select_model(use_vision=False), p.model)
```

- [ ] **Step 2: Run the test — expect failure**

```bash
docker compose exec django-api python manage.py test apps.copilot.tests.test_provider -v 2
```

Expected: `ImportError: cannot import name 'AIProvider' from 'apps.copilot.provider'`

- [ ] **Step 3: Create `backend/apps/copilot/provider.py`**

```python
from openai import AsyncOpenAI
from django.conf import settings


class AIProvider:
    def __init__(self):
        self.client = AsyncOpenAI(
            api_key=settings.AI_API_KEY,
            base_url=settings.AI_BASE_URL,
        )
        self.model = settings.AI_MODEL
        self.vision_model = settings.AI_VISION_MODEL

    def _select_model(self, use_vision: bool = False) -> str:
        return self.vision_model if use_vision else self.model

    async def stream(self, messages: list, tools: list | None = None, use_vision: bool = False):
        """Return an async streaming completion."""
        kwargs = {
            "model": self._select_model(use_vision),
            "messages": messages,
            "max_tokens": 1500,
            "stream": True,
            "extra_body": {"reasoning": {"max_reasoning_tokens": 800}},
        }
        if tools:
            kwargs["tools"] = tools
            kwargs["tool_choice"] = "auto"
        return await self.client.chat.completions.create(**kwargs)


_provider: AIProvider | None = None


def get_provider() -> AIProvider:
    global _provider
    if _provider is None:
        _provider = AIProvider()
    return _provider
```

- [ ] **Step 4: Run the test — expect pass**

```bash
docker compose exec django-api python manage.py test apps.copilot.tests.test_provider -v 2
```

Expected: `OK (2 tests)`

- [ ] **Step 5: Commit**

```bash
git add backend/apps/copilot/provider.py backend/apps/copilot/tests/
git commit -m "feat: add AIProvider wrapper for OpenRouter streaming"
```

---

### Task 3: Update `CopilotMessage` model

**Files:**
- Modify: `backend/apps/copilot/models.py`

- [ ] **Step 1: Add new fields to `CopilotMessage`**

Open `backend/apps/copilot/models.py`. After `tool_name = models.CharField(...)`, add:

```python
    thinking_content = models.TextField(blank=True, null=True)
    thinking_duration = models.FloatField(null=True, blank=True)
    media_url = models.URLField(max_length=500, null=True, blank=True)
    media_type = models.CharField(max_length=10, null=True, blank=True)
```

- [ ] **Step 2: Generate and apply migration**

```bash
docker compose exec django-api python manage.py makemigrations copilot --name add_message_streaming_fields
docker compose exec django-api python manage.py migrate
```

Expected: migration file created and applied without errors.

- [ ] **Step 3: Verify fields in Django shell**

```bash
docker compose exec django-api python manage.py shell -c "
from apps.copilot.models import CopilotMessage
fields = [f.name for f in CopilotMessage._meta.get_fields()]
assert 'thinking_content' in fields
assert 'media_url' in fields
print('OK:', fields)
"
```

- [ ] **Step 4: Commit**

```bash
git add backend/apps/copilot/models.py backend/apps/copilot/migrations/
git commit -m "feat: add thinking and media fields to CopilotMessage"
```

---

### Task 4: Create `stream_service.py`

**Files:**
- Create: `backend/apps/copilot/stream_service.py`
- Delete: `backend/apps/copilot/services.py`

- [ ] **Step 1: Create `backend/apps/copilot/stream_service.py`**

```python
import json
import time
from typing import AsyncGenerator

from apps.copilot.models import CopilotConversation, CopilotMessage
from apps.copilot.provider import get_provider

ASK_USER_QUESTIONS_TOOL = "ask_user_questions"

ASK_USER_QUESTIONS_DEFINITION = {
    "type": "function",
    "function": {
        "name": ASK_USER_QUESTIONS_TOOL,
        "description": (
            "Ask the user a series of questions to gather information needed to complete a task. "
            "Use this before taking any action that requires user-specific details."
        ),
        "parameters": {
            "type": "object",
            "required": ["title", "questions"],
            "properties": {
                "title": {"type": "string"},
                "questions": {
                    "type": "array",
                    "minItems": 1,
                    "maxItems": 5,
                    "items": {
                        "type": "object",
                        "required": ["id", "type", "label"],
                        "properties": {
                            "id": {"type": "string"},
                            "type": {"type": "string", "enum": ["radio", "checkbox", "text", "textarea"]},
                            "label": {"type": "string"},
                            "options": {"type": "array", "items": {"type": "string"}},
                            "placeholder": {"type": "string"},
                            "required": {"type": "boolean"},
                        },
                    },
                },
            },
        },
    },
}


def build_system_prompt(user) -> str:
    role_label = user.get_role_display() if hasattr(user, "get_role_display") else user.role
    return (
        "You are the Funderaise AI Copilot, an intelligent assistant for the "
        "Funderaise collaborative crowdfunding platform.\n\n"
        f"You are helping {user.full_name}, who is a {role_label} on the platform.\n\n"
        "Your capabilities:\n"
        "- Answer questions about the user's startups, campaigns, investments, and tasks\n"
        "- Provide platform statistics and insights\n"
        "- Help users understand their funding progress\n"
        "- Summarize notifications and recent activity\n"
        "- Create campaign updates and milestones\n"
        "- Manage kanban boards (create/delete columns, create/move/update/delete tasks)\n"
        "- Handle investments (create, confirm, cancel)\n"
        "- Follow/unfollow startups\n"
        "- Post campaign comments\n"
        "- Update user profile\n"
        "- Mark notifications as read\n"
        "- Ask the user clarifying questions using the ask_user_questions tool\n\n"
        "Guidelines:\n"
        "- Be concise and helpful\n"
        "- Use the available tools to fetch real data before answering data-related questions\n"
        "- Format currency values with $ signs and commas\n"
        "- Use ask_user_questions when you need specific details before taking an action\n"
        "- Never make up data — always use tools to verify\n"
        "- When showing lists, use clear formatting\n\n"
        "CRITICAL — ID lookup rule:\n"
        "NEVER guess or make up IDs. ALWAYS use read tools first to look up the correct IDs "
        "before calling action tools.\n\n"
        "IMPORTANT — Confirmation rule for action tools:\n"
        "Before calling ANY tool that creates, modifies, or deletes data, you MUST first "
        "describe exactly what you are about to do and ask the user to confirm. "
        "Read-only tools (get_*, search_*) do NOT require confirmation.\n"
    )


async def _build_messages(user, conversation: CopilotConversation) -> list:
    messages = [{"role": "system", "content": build_system_prompt(user)}]
    async for msg in conversation.messages.order_by("created_at"):
        if msg.role == "user":
            if msg.media_url and msg.media_type == "image":
                messages.append({
                    "role": "user",
                    "content": [
                        {"type": "image_url", "image_url": {"url": msg.media_url}},
                        {"type": "text", "text": msg.content or ""},
                    ],
                })
            else:
                text = msg.content or ""
                if msg.media_url and msg.media_type == "pdf":
                    text = f"[PDF attached]\n{text}"
                messages.append({"role": "user", "content": text})
        elif msg.role == "assistant":
            if msg.tool_calls:
                messages.append({
                    "role": "assistant",
                    "content": msg.content or None,
                    "tool_calls": msg.tool_calls,
                })
            else:
                messages.append({"role": "assistant", "content": msg.content})
        elif msg.role == "tool":
            messages.append({
                "role": "tool",
                "tool_call_id": msg.tool_name,
                "content": msg.content,
            })
    return messages


async def _run_stream_loop(
    user,
    conversation: CopilotConversation,
    messages: list,
    use_vision: bool = False,
) -> AsyncGenerator[tuple[str, dict], None]:
    from apps.copilot.tools import TOOL_DEFINITIONS, execute_tool
    from asgiref.sync import sync_to_async

    all_tools = [ASK_USER_QUESTIONS_DEFINITION] + TOOL_DEFINITIONS
    provider = get_provider()

    for _ in range(8):
        thinking_start = time.time()
        accumulated_thinking = ""
        accumulated_text = ""
        tool_calls_acc: dict[int, dict] = {}
        has_thinking = False

        stream = await provider.stream(messages, tools=all_tools, use_vision=use_vision)

        async for chunk in stream:
            if not chunk.choices:
                continue
            choice = chunk.choices[0]
            delta = choice.delta

            reasoning = getattr(delta, "reasoning_content", None)
            if reasoning:
                accumulated_thinking += reasoning
                has_thinking = True
                yield "thinking_delta", {"delta": reasoning}

            if delta.content:
                accumulated_text += delta.content
                yield "text_delta", {"delta": delta.content}

            if delta.tool_calls:
                for tc in delta.tool_calls:
                    idx = tc.index
                    if idx not in tool_calls_acc:
                        tool_calls_acc[idx] = {"id": "", "name": "", "arguments": ""}
                    if tc.id:
                        tool_calls_acc[idx]["id"] = tc.id
                    if tc.function and tc.function.name:
                        tool_calls_acc[idx]["name"] += tc.function.name
                    if tc.function and tc.function.arguments:
                        tool_calls_acc[idx]["arguments"] += tc.function.arguments

        if has_thinking:
            duration = round(time.time() - thinking_start, 1)
            yield "thinking_done", {"duration_seconds": duration}

        if tool_calls_acc:
            tool_calls_list = [
                {
                    "id": tc["id"],
                    "type": "function",
                    "function": {"name": tc["name"], "arguments": tc["arguments"]},
                }
                for tc in sorted(tool_calls_acc.items(), key=lambda x: x[0])
                for tc in [x[1]]
            ]

            await CopilotMessage.objects.acreate(
                conversation=conversation,
                role="assistant",
                content=accumulated_text or "",
                tool_calls=tool_calls_list,
                thinking_content=accumulated_thinking or None,
                thinking_duration=round(time.time() - thinking_start, 1) if has_thinking else None,
            )

            messages.append({
                "role": "assistant",
                "content": accumulated_text or None,
                "tool_calls": tool_calls_list,
            })

            for tc in tool_calls_list:
                tool_name = tc["function"]["name"]
                try:
                    tool_args = json.loads(tc["function"]["arguments"])
                except (json.JSONDecodeError, TypeError):
                    tool_args = {}

                for key, val in tool_args.items():
                    if isinstance(val, float) and val == int(val):
                        tool_args[key] = int(val)

                if tool_name == ASK_USER_QUESTIONS_TOOL:
                    yield "question_form", {
                        "tool_call_id": tc["id"],
                        "title": tool_args.get("title", ""),
                        "questions": tool_args.get("questions", []),
                    }
                    return

                yield "tool_start", {
                    "tool_call_id": tc["id"],
                    "tool_name": tool_name,
                    "input": tool_args,
                }

                result = await sync_to_async(execute_tool)(tool_name, user, tool_args)

                yield "tool_result", {"tool_call_id": tc["id"], "result": result}

                await CopilotMessage.objects.acreate(
                    conversation=conversation,
                    role="tool",
                    content=json.dumps(result, default=str),
                    tool_name=tc["id"],
                )

                messages.append({
                    "role": "tool",
                    "tool_call_id": tc["id"],
                    "content": json.dumps(result, default=str),
                })

            continue

        saved = await CopilotMessage.objects.acreate(
            conversation=conversation,
            role="assistant",
            content=accumulated_text or "I processed your request but have no additional information to share.",
            thinking_content=accumulated_thinking or None,
            thinking_duration=round(time.time() - thinking_start, 1) if has_thinking else None,
        )
        yield "done", {"message_id": str(saved.id)}
        return

    saved = await CopilotMessage.objects.acreate(
        conversation=conversation,
        role="assistant",
        content="I apologize, but I'm having trouble processing your request. Please try again.",
    )
    yield "done", {"message_id": str(saved.id)}


async def stream_conversation(
    user, conversation: CopilotConversation, content: str,
    media_url: str | None = None, media_type: str | None = None,
) -> AsyncGenerator[tuple[str, dict], None]:
    if not conversation.title and content:
        conversation.title = content[:100]
        await conversation.asave(update_fields=["title", "updated_at"])

    await CopilotMessage.objects.acreate(
        conversation=conversation,
        role="user",
        content=content,
        media_url=media_url,
        media_type=media_type,
    )

    messages = await _build_messages(user, conversation)
    use_vision = bool(media_url and media_type == "image")

    async for event in _run_stream_loop(user, conversation, messages, use_vision=use_vision):
        yield event


async def continue_from_tool_result(
    user, conversation: CopilotConversation, tool_call_id: str, answers: dict,
) -> AsyncGenerator[tuple[str, dict], None]:
    await CopilotMessage.objects.acreate(
        conversation=conversation,
        role="tool",
        content=json.dumps(answers, default=str),
        tool_name=tool_call_id,
    )

    messages = await _build_messages(user, conversation)

    async for event in _run_stream_loop(user, conversation, messages, use_vision=False):
        yield event
```

- [ ] **Step 2: Fix the tool_calls_list generator comprehension bug** — the nested comprehension above has a bug. Replace the `tool_calls_list` assignment with:

```python
            tool_calls_list = []
            for idx in sorted(tool_calls_acc.keys()):
                tc = tool_calls_acc[idx]
                tool_calls_list.append({
                    "id": tc["id"],
                    "type": "function",
                    "function": {"name": tc["name"], "arguments": tc["arguments"]},
                })
```

- [ ] **Step 3: Delete the old services.py**

```bash
rm backend/apps/copilot/services.py
```

- [ ] **Step 4: Commit**

```bash
git add backend/apps/copilot/stream_service.py
git rm backend/apps/copilot/services.py
git commit -m "feat: add streaming service with SSE event loop and ask_user_questions support"
```

---

### Task 5: Replace views with async SSE views

**Files:**
- Modify: `backend/apps/copilot/views.py`
- Modify: `backend/apps/copilot/urls.py`

- [ ] **Step 1: Rewrite `backend/apps/copilot/views.py`**

```python
import json

from django.http import JsonResponse, StreamingHttpResponse
from django.views.decorators.csrf import csrf_exempt
from rest_framework import generics, permissions, status
from rest_framework.response import Response

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
```

- [ ] **Step 2: Update `backend/apps/copilot/urls.py`**

```python
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
```

- [ ] **Step 3: Create `backend/apps/copilot/storage.py`**

```python
import mimetypes
import requests
from django.conf import settings


def upload_to_supabase(file_bytes: bytes, filename: str, bucket: str, path: str) -> str:
    mime_type, _ = mimetypes.guess_type(filename)
    url = f"{settings.SUPABASE_URL}/storage/v1/object/{bucket}/{path}"
    resp = requests.post(
        url,
        headers={
            "Authorization": f"Bearer {settings.SUPABASE_SERVICE_ROLE_KEY}",
            "Content-Type": mime_type or "application/octet-stream",
        },
        data=file_bytes,
        timeout=30,
    )
    resp.raise_for_status()
    return f"{settings.SUPABASE_URL}/storage/v1/object/public/{bucket}/{path}"
```

- [ ] **Step 4: Create the `copilot-media` bucket in Supabase**

In your Supabase dashboard → Storage → New bucket → name: `copilot-media` → Public: on. Do the same for `user-documents`.

- [ ] **Step 5: Restart and smoke-test**

```bash
docker compose up -d
curl -s http://localhost:8000/api/health/ | python3 -m json.tool
```

Expected: `{"status": "ok"}` or similar.

- [ ] **Step 6: Commit**

```bash
git add backend/apps/copilot/views.py backend/apps/copilot/urls.py backend/apps/copilot/storage.py
git commit -m "feat: replace sync endpoint with async SSE streaming views"
```

---

### Task 6: Add streaming types and `useAIStream` hook

**Files:**
- Modify: `frontend/src/types/index.ts`
- Create: `frontend/src/hooks/useAIStream.ts`

- [ ] **Step 1: Add new types to `frontend/src/types/index.ts`**

After the existing `CopilotConversationDetail` interface, add:

```typescript
export interface QuestionOption {
  value: string;
}

export interface QuestionDef {
  id: string;
  type: "radio" | "checkbox" | "text" | "textarea";
  label: string;
  options?: string[];
  placeholder?: string;
  required?: boolean;
}

export interface QuestionForm {
  tool_call_id: string;
  title: string;
  questions: QuestionDef[];
}

export interface ToolCallState {
  tool_call_id: string;
  tool_name: string;
  input: Record<string, unknown>;
  result?: unknown;
}

export interface AIStreamState {
  pendingUserContent: string | null;
  pendingMediaUrl: string | null;
  pendingMediaType: string | null;
  liveThinking: string;
  thinkingDuration: number | null;
  liveText: string;
  toolCalls: ToolCallState[];
  questionForm: QuestionForm | null;
  isStreaming: boolean;
  streamError: string | null;
}
```

- [ ] **Step 2: Create `frontend/src/hooks/useAIStream.ts`**

```typescript
import { useState, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabase";
import type { AIStreamState, QuestionForm, ToolCallState } from "@/types";

const API_BASE = "/api";

async function getAuthHeaders(): Promise<HeadersInit> {
  const { data: { session } } = await supabase.auth.getSession();
  return {
    "Content-Type": "application/json",
    ...(session?.access_token
      ? { Authorization: `Bearer ${session.access_token}` }
      : {}),
  };
}

const INITIAL_STATE: AIStreamState = {
  pendingUserContent: null,
  pendingMediaUrl: null,
  pendingMediaType: null,
  liveThinking: "",
  thinkingDuration: null,
  liveText: "",
  toolCalls: [],
  questionForm: null,
  isStreaming: false,
  streamError: null,
};

export function useAIStream(
  conversationId: string | null,
  onDone: (messageId: string) => void,
) {
  const [state, setState] = useState<AIStreamState>(INITIAL_STATE);
  const abortRef = useRef<AbortController | null>(null);

  const reset = useCallback(() => {
    setState(INITIAL_STATE);
  }, []);

  const _consumeStream = useCallback(
    async (url: string, body: Record<string, unknown>) => {
      if (abortRef.current) abortRef.current.abort();
      const ctrl = new AbortController();
      abortRef.current = ctrl;

      setState((s) => ({ ...s, isStreaming: true, streamError: null }));

      try {
        const headers = await getAuthHeaders();
        const res = await fetch(url, {
          method: "POST",
          headers,
          body: JSON.stringify(body),
          signal: ctrl.signal,
        });

        if (!res.ok || !res.body) {
          setState((s) => ({
            ...s,
            isStreaming: false,
            streamError: `Request failed: ${res.status}`,
          }));
          return;
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          let eventType = "";
          for (const line of lines) {
            if (line.startsWith("event: ")) {
              eventType = line.slice(7).trim();
            } else if (line.startsWith("data: ") && eventType) {
              let data: Record<string, unknown>;
              try {
                data = JSON.parse(line.slice(6));
              } catch {
                eventType = "";
                continue;
              }

              switch (eventType) {
                case "thinking_delta":
                  setState((s) => ({
                    ...s,
                    liveThinking: s.liveThinking + (data.delta as string),
                  }));
                  break;
                case "thinking_done":
                  setState((s) => ({
                    ...s,
                    thinkingDuration: data.duration_seconds as number,
                  }));
                  break;
                case "text_delta":
                  setState((s) => ({
                    ...s,
                    liveText: s.liveText + (data.delta as string),
                  }));
                  break;
                case "tool_start":
                  setState((s) => ({
                    ...s,
                    toolCalls: [
                      ...s.toolCalls,
                      {
                        tool_call_id: data.tool_call_id as string,
                        tool_name: data.tool_name as string,
                        input: data.input as Record<string, unknown>,
                      },
                    ],
                  }));
                  break;
                case "tool_result":
                  setState((s) => ({
                    ...s,
                    toolCalls: s.toolCalls.map((tc) =>
                      tc.tool_call_id === data.tool_call_id
                        ? { ...tc, result: data.result }
                        : tc,
                    ),
                  }));
                  break;
                case "question_form":
                  setState((s) => ({
                    ...s,
                    isStreaming: false,
                    questionForm: data as unknown as QuestionForm,
                  }));
                  break;
                case "done":
                  setState((s) => ({ ...s, isStreaming: false }));
                  onDone(data.message_id as string);
                  break;
                case "error":
                  setState((s) => ({
                    ...s,
                    isStreaming: false,
                    streamError: data.message as string,
                  }));
                  break;
              }
              eventType = "";
            }
          }
        }
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          setState((s) => ({
            ...s,
            isStreaming: false,
            streamError: "Connection error. Please try again.",
          }));
        }
      }
    },
    [onDone],
  );

  const submit = useCallback(
    (content: string, mediaUrl?: string, mediaType?: string) => {
      if (!conversationId) return;
      setState({
        ...INITIAL_STATE,
        pendingUserContent: content,
        pendingMediaUrl: mediaUrl ?? null,
        pendingMediaType: mediaType ?? null,
        isStreaming: true,
      });
      _consumeStream(
        `${API_BASE}/copilot/conversations/${conversationId}/messages/stream/`,
        { content, media_url: mediaUrl ?? null, media_type: mediaType ?? null },
      );
    },
    [conversationId, _consumeStream],
  );

  const submitToolResult = useCallback(
    (toolCallId: string, answers: Record<string, unknown>) => {
      if (!conversationId) return;
      setState((s) => ({
        ...s,
        questionForm: null,
        liveThinking: "",
        thinkingDuration: null,
        liveText: "",
        toolCalls: [],
        isStreaming: true,
        streamError: null,
      }));
      _consumeStream(
        `${API_BASE}/copilot/conversations/${conversationId}/messages/tool_result/`,
        { tool_call_id: toolCallId, answers },
      );
    },
    [conversationId, _consumeStream],
  );

  return { state, submit, submitToolResult, reset };
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/types/index.ts frontend/src/hooks/useAIStream.ts
git commit -m "feat: add useAIStream hook for SSE streaming with thinking/tools/questions"
```

---

## Phase 2 — Chat UI Overhaul

---

### Task 7: Create `ThinkingBlock` and `ToolCallBlock` components

**Files:**
- Create: `frontend/src/components/copilot/ThinkingBlock.tsx`
- Create: `frontend/src/components/copilot/ToolCallBlock.tsx`

- [ ] **Step 1: Create `frontend/src/components/copilot/ThinkingBlock.tsx`**

```tsx
import { useState } from "react";
import { ChevronRight } from "lucide-react";

interface ThinkingBlockProps {
  content: string;
  duration: number | null;
  isStreaming: boolean;
}

export function ThinkingBlock({ content, duration, isStreaming }: ThinkingBlockProps) {
  const [open, setOpen] = useState(false);

  if (!content && !isStreaming) return null;

  const label = isStreaming
    ? "Thinking"
    : `Thought for ${duration?.toFixed(1) ?? "?"} seconds`;

  return (
    <div className="mb-1 text-xs text-brand-muted">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1 hover:text-brand-text transition-colors"
      >
        <ChevronRight
          className={`w-3 h-3 transition-transform ${open ? "rotate-90" : ""}`}
        />
        <span>{label}</span>
        {isStreaming && (
          <span className="flex gap-0.5 ml-1">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="w-1 h-1 rounded-full bg-brand-muted animate-bounce"
                style={{ animationDelay: `${i * 0.15}s` }}
              />
            ))}
          </span>
        )}
      </button>
      {open && content && (
        <div className="mt-1 ml-4 p-2 rounded-lg bg-brand-border/20 text-brand-muted leading-relaxed whitespace-pre-wrap max-h-48 overflow-y-auto">
          {content}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Create `frontend/src/components/copilot/ToolCallBlock.tsx`**

```tsx
import { useState } from "react";
import { ChevronRight, Wrench } from "lucide-react";
import type { ToolCallState } from "@/types";

interface ToolCallBlockProps {
  toolCalls: ToolCallState[];
}

function SingleTool({ tc }: { tc: ToolCallState }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="text-xs text-brand-muted mb-0.5">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1 hover:text-brand-text transition-colors"
      >
        <ChevronRight className={`w-3 h-3 transition-transform ${open ? "rotate-90" : ""}`} />
        <Wrench className="w-3 h-3" />
        <span className="font-mono">{tc.tool_name}</span>
        {!tc.result && (
          <span className="w-1.5 h-1.5 rounded-full bg-brand-accent animate-pulse ml-1" />
        )}
      </button>
      {open && (
        <div className="mt-1 ml-4 space-y-1">
          <div className="p-2 rounded-lg bg-brand-border/20">
            <p className="font-semibold text-brand-text mb-1">Input</p>
            <pre className="overflow-x-auto whitespace-pre-wrap break-words text-[11px] text-brand-muted">
              {JSON.stringify(tc.input, null, 2)}
            </pre>
          </div>
          {tc.result !== undefined && (
            <div className="p-2 rounded-lg bg-brand-border/20">
              <p className="font-semibold text-brand-text mb-1">Result</p>
              <pre className="overflow-x-auto whitespace-pre-wrap break-words text-[11px] text-brand-muted max-h-64 overflow-y-auto">
                {typeof tc.result === "string"
                  ? tc.result
                  : JSON.stringify(tc.result, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function ToolCallBlock({ toolCalls }: ToolCallBlockProps) {
  const [groupOpen, setGroupOpen] = useState(false);
  if (toolCalls.length === 0) return null;

  if (toolCalls.length === 1) return <SingleTool tc={toolCalls[0]} />;

  return (
    <div className="text-xs text-brand-muted mb-0.5">
      <button
        onClick={() => setGroupOpen((o) => !o)}
        className="flex items-center gap-1 hover:text-brand-text transition-colors"
      >
        <ChevronRight className={`w-3 h-3 transition-transform ${groupOpen ? "rotate-90" : ""}`} />
        <Wrench className="w-3 h-3" />
        <span>{toolCalls.length} Tools executed</span>
      </button>
      {groupOpen && (
        <div className="ml-4 mt-1 space-y-0.5">
          {toolCalls.map((tc) => <SingleTool key={tc.tool_call_id} tc={tc} />)}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/copilot/ThinkingBlock.tsx frontend/src/components/copilot/ToolCallBlock.tsx
git commit -m "feat: add ThinkingBlock and ToolCallBlock chat UI components"
```

---

### Task 8: Create `MediaPreview`, `FileUploadZone`, and `ExamplePrompts`

**Files:**
- Create: `frontend/src/components/copilot/MediaPreview.tsx`
- Create: `frontend/src/components/copilot/FileUploadZone.tsx`
- Create: `frontend/src/components/copilot/ExamplePrompts.tsx`

- [ ] **Step 1: Create `frontend/src/components/copilot/MediaPreview.tsx`**

```tsx
import { FileText } from "lucide-react";

interface MediaPreviewProps {
  url: string;
  mediaType: string;
  filename?: string;
  sizeBytes?: number;
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function MediaPreview({ url, mediaType, filename, sizeBytes }: MediaPreviewProps) {
  if (mediaType === "image") {
    return (
      <div className="mb-2 inline-block">
        <div className="rounded-xl overflow-hidden shadow-sm border border-brand-border/30 bg-brand-bg max-w-[240px]">
          <img src={url} alt="Attached" className="w-full h-auto object-cover max-h-40" />
        </div>
      </div>
    );
  }

  return (
    <div className="mb-2 inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-brand-bg border border-brand-border/30 shadow-sm max-w-[240px]">
      <FileText className="w-4 h-4 text-brand-accent shrink-0" />
      <div className="min-w-0">
        <p className="text-xs font-medium text-brand-text truncate">{filename ?? "Document"}</p>
        {sizeBytes !== undefined && (
          <p className="text-[10px] text-brand-muted">{formatBytes(sizeBytes)}</p>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create `frontend/src/components/copilot/FileUploadZone.tsx`**

```tsx
import { useRef, useState, useCallback } from "react";
import { Paperclip, X } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { MediaPreview } from "./MediaPreview";

interface AttachedFile {
  url: string;
  mediaType: string;
  filename: string;
  sizeBytes: number;
}

interface FileUploadZoneProps {
  children: React.ReactNode;
  onAttach: (file: AttachedFile | null) => void;
  attached: AttachedFile | null;
  disabled?: boolean;
}

async function uploadFile(file: File): Promise<AttachedFile> {
  const { data: { session } } = await supabase.auth.getSession();
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch("/api/copilot/upload/", {
    method: "POST",
    headers: session?.access_token
      ? { Authorization: `Bearer ${session.access_token}` }
      : {},
    body: formData,
  });
  if (!res.ok) throw new Error("Upload failed");
  return res.json();
}

export function FileUploadZone({ children, onAttach, attached, disabled }: FileUploadZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);

  const handleFile = useCallback(async (file: File) => {
    if (file.size > 10 * 1024 * 1024) {
      alert("File too large (max 10MB)");
      return;
    }
    setUploading(true);
    try {
      const result = await uploadFile(file);
      onAttach(result);
    } catch {
      alert("Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  }, [onAttach]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  return (
    <div
      className="relative"
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
    >
      {dragging && (
        <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl border-2 border-dashed border-brand-accent bg-brand-accent/5">
          <p className="text-sm font-medium text-brand-accent">Drop image or PDF</p>
        </div>
      )}
      {attached && (
        <div className="px-3 pt-2 flex items-start gap-2">
          <MediaPreview
            url={attached.url}
            mediaType={attached.mediaType}
            filename={attached.filename}
            sizeBytes={attached.sizeBytes}
          />
          <button
            onClick={() => onAttach(null)}
            className="mt-1 text-brand-muted hover:text-brand-text"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
      <div className="flex items-end gap-1">
        <button
          type="button"
          disabled={disabled || uploading}
          onClick={() => inputRef.current?.click()}
          className="p-2 text-brand-muted hover:text-brand-text disabled:opacity-40 transition-colors"
          title="Attach image or PDF"
        >
          <Paperclip className={`w-4 h-4 ${uploading ? "animate-pulse" : ""}`} />
        </button>
        {children}
      </div>
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        accept="image/*,.pdf"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          e.target.value = "";
        }}
      />
    </div>
  );
}
```

- [ ] **Step 3: Create `frontend/src/components/copilot/ExamplePrompts.tsx`**

```tsx
import { useAuth } from "@/contexts/AuthContext";

const PROMPTS: Record<string, string[]> = {
  founder: [
    "Summarize my active campaigns",
    "What tasks are overdue on my kanban?",
    "Draft a campaign update",
    "Who are my recent investors?",
  ],
  investor: [
    "Show my investment portfolio",
    "Find campaigns in my preferred industries",
    "What's my total committed amount?",
    "Suggest campaigns to explore",
  ],
  team_member: [
    "What tasks are assigned to me?",
    "Show recent campaign updates",
    "Summarize the kanban board",
    "What's new on my startup?",
  ],
  admin: [
    "Show platform statistics",
    "List recent user signups",
    "Summarize pending approvals",
    "How many active campaigns?",
  ],
};

interface ExamplePromptsProps {
  onSelect: (prompt: string) => void;
}

export function ExamplePrompts({ onSelect }: ExamplePromptsProps) {
  const { profile } = useAuth();
  const prompts = PROMPTS[profile?.role ?? "investor"] ?? PROMPTS.investor;

  return (
    <div className="flex flex-col items-center gap-4 py-6 px-2">
      <p className="text-sm text-brand-muted text-center">
        What can I help you with today?
      </p>
      <div className="grid grid-cols-2 gap-2 w-full">
        {prompts.map((p) => (
          <button
            key={p}
            onClick={() => onSelect(p)}
            className="text-left text-xs px-3 py-2.5 rounded-xl border border-brand-border/40 bg-brand-bg hover:border-brand-accent/50 hover:bg-brand-accent/5 text-brand-muted hover:text-brand-text transition-all leading-snug"
          >
            {p}
          </button>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/copilot/MediaPreview.tsx frontend/src/components/copilot/FileUploadZone.tsx frontend/src/components/copilot/ExamplePrompts.tsx
git commit -m "feat: add MediaPreview, FileUploadZone, and ExamplePrompts components"
```

---

### Task 9: Rewrite `AICopilotPanel`

**Files:**
- Rewrite: `frontend/src/components/copilot/AICopilotPanel.tsx`

- [ ] **Step 1: Rewrite the full component**

```tsx
import { useState, useEffect, useRef, useCallback } from "react";
import { Bot, Send, ArrowLeft, Plus, Trash2 } from "lucide-react";
import { api } from "@/lib/api";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { useAIStream } from "@/hooks/useAIStream";
import { ThinkingBlock } from "./ThinkingBlock";
import { ToolCallBlock } from "./ToolCallBlock";
import { MediaPreview } from "./MediaPreview";
import { FileUploadZone } from "./FileUploadZone";
import { ExamplePrompts } from "./ExamplePrompts";
import type {
  CopilotConversation,
  CopilotConversationDetail,
  CopilotMessage,
} from "@/types";

interface AttachedFile {
  url: string;
  mediaType: string;
  filename: string;
  sizeBytes: number;
}

interface AICopilotPanelProps {
  onClose?: () => void;
  fullPage?: boolean;
}

export function AICopilotPanel({ onClose, fullPage = false }: AICopilotPanelProps) {
  const [conversations, setConversations] = useState<CopilotConversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<CopilotConversationDetail | null>(null);
  const [input, setInput] = useState("");
  const [attached, setAttached] = useState<AttachedFile | null>(null);
  const [loadingConvs, setLoadingConvs] = useState(false);
  const [loadingChat, setLoadingChat] = useState(false);
  const [view, setView] = useState<"list" | "chat">("list");

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Use a ref to avoid stale closure over activeConversation inside the SSE callback
  const activeConvRef = useRef<CopilotConversationDetail | null>(null);
  activeConvRef.current = activeConversation;

  const handleStreamDone = useCallback(async (_messageId: string) => {
    const conv = activeConvRef.current;
    if (!conv) return;
    try {
      const detail = await api.get<CopilotConversationDetail>(
        `/copilot/conversations/${conv.id}/`
      );
      setActiveConversation(detail);
      setConversations((prev) =>
        prev.map((c) =>
          c.id === detail.id
            ? { ...c, title: detail.title, last_message: detail.messages.at(-1) ?? null }
            : c
        )
      );
    } catch {
      /* ignore */
    }
  }, []); // stable — reads conv via ref

  const { state: stream, submit, submitToolResult, reset: resetStream } = useAIStream(
    activeConversation?.id ?? null,
    handleStreamDone,
  );

  useEffect(() => {
    setLoadingConvs(true);
    api.get<CopilotConversation[]>("/copilot/conversations/")
      .then(setConversations)
      .catch(console.error)
      .finally(() => setLoadingConvs(false));
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeConversation?.messages, stream.liveText]);

  useEffect(() => {
    if (view === "chat") inputRef.current?.focus();
  }, [view]);

  const handleNewConversation = useCallback(async () => {
    const conv = await api.post<CopilotConversation>("/copilot/conversations/", {});
    setConversations((prev) => [conv, ...prev]);
    setActiveConversation({ ...conv, messages: [] });
    resetStream();
    setView("chat");
  }, [resetStream]);

  const handleSelectConversation = useCallback(async (id: string) => {
    setLoadingChat(true);
    const detail = await api.get<CopilotConversationDetail>(`/copilot/conversations/${id}/`);
    setActiveConversation(detail);
    resetStream();
    setView("chat");
    setLoadingChat(false);
  }, [resetStream]);

  const handleDelete = useCallback(async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    await api.delete(`/copilot/conversations/${id}/`);
    setConversations((prev) => prev.filter((c) => c.id !== id));
    if (activeConversation?.id === id) {
      setActiveConversation(null);
      setView("list");
    }
  }, [activeConversation?.id]);

  const handleSend = useCallback(() => {
    const text = input.trim();
    if ((!text && !attached) || stream.isStreaming || !activeConversation) return;
    setInput("");
    setAttached(null);
    submit(text, attached?.url, attached?.mediaType);
  }, [input, attached, stream.isStreaming, activeConversation, submit]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const messages: CopilotMessage[] = activeConversation?.messages ?? [];
  const isEmpty = messages.length === 0 && !stream.pendingUserContent;

  const chatContent = (
    <div className={`flex flex-col ${fullPage ? "h-full" : "h-[440px]"}`}>
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2.5 border-b border-brand-border/30 shrink-0">
        {!fullPage && (
          <button onClick={() => { setView("list"); resetStream(); }} className="text-brand-muted hover:text-brand-text">
            <ArrowLeft className="w-4 h-4" />
          </button>
        )}
        <Bot className="w-4 h-4 text-brand-accent" />
        <span className="text-sm font-medium text-brand-text truncate flex-1">
          {activeConversation?.title || "New conversation"}
        </span>
        {onClose && !fullPage && (
          <button onClick={onClose} className="text-brand-muted hover:text-brand-text text-lg leading-none">×</button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
        {loadingChat && <div className="flex justify-center py-4"><LoadingSpinner /></div>}

        {isEmpty && !loadingChat && (
          <ExamplePrompts onSelect={(p) => { setInput(p); inputRef.current?.focus(); }} />
        )}

        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            {msg.role === "user" ? (
              <div className="max-w-[80%]">
                {msg.media_url && (
                  <div className="flex justify-end">
                    <MediaPreview url={msg.media_url} mediaType={msg.media_type ?? "image"} />
                  </div>
                )}
                <div className="bg-brand-accent text-white px-3 py-2 rounded-2xl rounded-tr-sm text-sm">
                  {msg.content}
                </div>
              </div>
            ) : (
              <div className="max-w-[85%] space-y-0.5">
                <div className="px-3 py-2 rounded-2xl rounded-tl-sm bg-white border border-brand-border/20 shadow-sm text-sm text-brand-text whitespace-pre-wrap">
                  {msg.content}
                </div>
              </div>
            )}
          </div>
        ))}

        {/* Pending user message */}
        {stream.pendingUserContent !== null && (
          <div className="flex justify-end">
            <div className="max-w-[80%]">
              {stream.pendingMediaUrl && (
                <div className="flex justify-end">
                  <MediaPreview
                    url={stream.pendingMediaUrl}
                    mediaType={stream.pendingMediaType ?? "image"}
                  />
                </div>
              )}
              <div className="bg-brand-accent text-white px-3 py-2 rounded-2xl rounded-tr-sm text-sm">
                {stream.pendingUserContent}
              </div>
            </div>
          </div>
        )}

        {/* Streaming AI response */}
        {(stream.toolCalls.length > 0 || stream.liveThinking || stream.liveText || stream.isStreaming) && (
          <div className="flex justify-start">
            <div className="max-w-[85%] space-y-0.5">
              <ToolCallBlock toolCalls={stream.toolCalls} />
              {(stream.liveThinking || (stream.isStreaming && !stream.liveText)) && (
                <ThinkingBlock
                  content={stream.liveThinking}
                  duration={stream.thinkingDuration}
                  isStreaming={stream.isStreaming && !stream.thinkingDuration}
                />
              )}
              {stream.liveText && (
                <div className="px-3 py-2 rounded-2xl rounded-tl-sm bg-white border border-brand-border/20 shadow-sm text-sm text-brand-text whitespace-pre-wrap">
                  {stream.liveText}
                  {stream.isStreaming && <span className="inline-block w-1 h-4 bg-brand-muted animate-pulse ml-0.5 align-text-bottom" />}
                </div>
              )}
              {stream.isStreaming && !stream.liveText && !stream.liveThinking && stream.toolCalls.length === 0 && (
                <div className="px-3 py-2 rounded-2xl rounded-tl-sm bg-white border border-brand-border/20 shadow-sm">
                  <div className="flex gap-1">
                    {[0, 1, 2].map((i) => (
                      <span key={i} className="w-1.5 h-1.5 rounded-full bg-brand-muted animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Question form placeholder — wired in Task 10 */}
        {stream.questionForm && (
          <div className="flex justify-start">
            <div className="max-w-[90%] w-full px-3 py-2 rounded-2xl rounded-tl-sm bg-white border border-brand-border/20 shadow-sm text-sm text-brand-muted italic">
              [Question form: {stream.questionForm.title}] — wire QuestionForm in Task 10
            </div>
          </div>
        )}

        {stream.streamError && (
          <div className="text-xs text-red-500 px-3">{stream.streamError}</div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-brand-border/30 shrink-0">
        <FileUploadZone onAttach={setAttached} attached={attached} disabled={stream.isStreaming}>
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Message AI Copilot..."
            rows={1}
            disabled={stream.isStreaming || !!stream.questionForm}
            className="flex-1 resize-none bg-transparent text-sm text-brand-text placeholder:text-brand-muted focus:outline-none py-2 pr-2 min-h-[36px] max-h-24"
            style={{ fieldSizing: "content" } as React.CSSProperties}
          />
          <button
            onClick={handleSend}
            disabled={(!input.trim() && !attached) || stream.isStreaming || !!stream.questionForm}
            className="p-2 text-brand-accent disabled:opacity-40 hover:text-brand-accent/80 transition-colors mb-1"
          >
            <Send className="w-4 h-4" />
          </button>
        </FileUploadZone>
      </div>
    </div>
  );

  const listContent = (
    <div className={`flex flex-col ${fullPage ? "h-full" : "h-[440px]"}`}>
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-brand-border/30 shrink-0">
        <div className="flex items-center gap-2">
          <Bot className="w-4 h-4 text-brand-accent" />
          <span className="text-sm font-medium text-brand-text">AI Copilot</span>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={handleNewConversation} className="p-1.5 rounded-lg hover:bg-brand-border/20 text-brand-muted hover:text-brand-text transition-colors" title="New conversation">
            <Plus className="w-4 h-4" />
          </button>
          {onClose && !fullPage && (
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-brand-border/20 text-brand-muted hover:text-brand-text transition-colors text-lg leading-none">×</button>
          )}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        {loadingConvs ? (
          <div className="flex justify-center py-6"><LoadingSpinner /></div>
        ) : conversations.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-10 px-4 text-center">
            <Bot className="w-8 h-8 text-brand-muted/50" />
            <p className="text-sm text-brand-muted">No conversations yet.</p>
            <button onClick={handleNewConversation} className="text-sm text-brand-accent hover:underline">Start one</button>
          </div>
        ) : (
          conversations.map((conv) => (
            <div
              key={conv.id}
              onClick={() => handleSelectConversation(conv.id)}
              className="group flex items-start gap-2 px-3 py-2.5 hover:bg-brand-border/20 cursor-pointer border-b border-brand-border/10 last:border-0"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-brand-text truncate">{conv.title || "Untitled"}</p>
                {conv.last_message && (
                  <p className="text-xs text-brand-muted truncate mt-0.5">{conv.last_message.content}</p>
                )}
              </div>
              <button
                onClick={(e) => handleDelete(e, conv.id)}
                className="opacity-0 group-hover:opacity-100 p-1 rounded text-brand-muted hover:text-red-500 transition-all shrink-0"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );

  if (fullPage) {
    return (
      <div className="flex h-full">
        <div className="w-[280px] shrink-0 border-r border-brand-border/30 overflow-hidden">
          {listContent}
        </div>
        <div className="flex-1 overflow-hidden">
          {activeConversation ? chatContent : (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-brand-muted">
              <Bot className="w-10 h-10 opacity-30" />
              <p className="text-sm">Select or start a conversation</p>
              <button onClick={handleNewConversation} className="text-sm text-brand-accent hover:underline">New conversation</button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return view === "chat" ? chatContent : listContent;
}
```

- [ ] **Step 2: Remove the now-unused `CopilotMessage` import type from types if `media_url`/`media_type` are missing** — update the `CopilotMessage` type in `frontend/src/types/index.ts` to add optional media fields:

```typescript
export interface CopilotMessage {
  id: number;
  role: "user" | "assistant" | "tool";
  content: string;
  media_url?: string | null;
  media_type?: string | null;
  created_at: string;
}
```

- [ ] **Step 3: Start the dev server and open the copilot bubble**

```bash
docker compose up -d
```

Open `http://localhost:5173`, log in, click the AI bubble. Verify:
- Conversation list loads
- Creating a new conversation shows the example prompts grid
- Sending a message starts streaming (text appears token by token)
- Any error shows in red below the input

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/copilot/AICopilotPanel.tsx frontend/src/types/index.ts
git commit -m "feat: rewrite AICopilotPanel with streaming, thinking blocks, and tool display"
```

---

## Phase 3 — Question Widget

---

### Task 10: Add `ask_user_questions` to tools and create `QuestionForm`

**Files:**
- Modify: `backend/apps/copilot/tools.py`
- Create: `frontend/src/components/copilot/QuestionForm.tsx`
- Modify: `frontend/src/components/copilot/AICopilotPanel.tsx`

- [ ] **Step 1: Open `backend/apps/copilot/tools.py` and find `TOOL_DEFINITIONS`**

The `TOOL_DEFINITIONS` list is at the bottom of the file. Add the `ask_user_questions` definition as the **first item** in the list. The definition is already in `stream_service.py` as `ASK_USER_QUESTIONS_DEFINITION` — add the same object to `TOOL_DEFINITIONS`:

```python
# At the top of TOOL_DEFINITIONS, before all other tools:
TOOL_DEFINITIONS = [
    {
        "type": "function",
        "function": {
            "name": "ask_user_questions",
            "description": (
                "Ask the user a series of questions to gather information needed to complete a task. "
                "Use this before taking any action that requires user-specific details."
            ),
            "parameters": {
                "type": "object",
                "required": ["title", "questions"],
                "properties": {
                    "title": {"type": "string"},
                    "questions": {
                        "type": "array",
                        "minItems": 1,
                        "maxItems": 5,
                        "items": {
                            "type": "object",
                            "required": ["id", "type", "label"],
                            "properties": {
                                "id": {"type": "string"},
                                "type": {"type": "string", "enum": ["radio", "checkbox", "text", "textarea"]},
                                "label": {"type": "string"},
                                "options": {"type": "array", "items": {"type": "string"}},
                                "placeholder": {"type": "string"},
                                "required": {"type": "boolean"},
                            },
                        },
                    },
                },
            },
        },
    },
    # ... existing tool definitions follow unchanged ...
]
```

Also update `stream_service.py`: since `ASK_USER_QUESTIONS_DEFINITION` is now in `TOOL_DEFINITIONS`, remove the duplicate. Change the import line in `stream_service.py`:

```python
from apps.copilot.tools import TOOL_DEFINITIONS, execute_tool

# Remove the local ASK_USER_QUESTIONS_DEFINITION and change:
all_tools = TOOL_DEFINITIONS  # already includes ask_user_questions as first item
```

- [ ] **Step 2: Create `frontend/src/components/copilot/QuestionForm.tsx`**

```tsx
import { useState } from "react";
import { ChevronLeft, ChevronRight, Check, Edit2 } from "lucide-react";
import type { QuestionDef, QuestionForm as QuestionFormType } from "@/types";

interface QuestionFormProps {
  form: QuestionFormType;
  onSubmit: (toolCallId: string, answers: Record<string, unknown>) => void;
  disabled?: boolean;
}

function QuestionInput({
  question,
  value,
  onChange,
}: {
  question: QuestionDef;
  value: unknown;
  onChange: (val: unknown) => void;
}) {
  if (question.type === "radio") {
    return (
      <div className="space-y-2">
        {(question.options ?? []).map((opt) => (
          <label key={opt} className="flex items-center gap-2.5 cursor-pointer group">
            <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors ${value === opt ? "border-brand-accent bg-brand-accent" : "border-brand-border group-hover:border-brand-accent/60"}`}>
              {value === opt && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
            </div>
            <input type="radio" className="sr-only" checked={value === opt} onChange={() => onChange(opt)} />
            <span className="text-sm text-brand-text">{opt}</span>
          </label>
        ))}
      </div>
    );
  }

  if (question.type === "checkbox") {
    const selected = Array.isArray(value) ? (value as string[]) : [];
    return (
      <div className="space-y-2">
        {(question.options ?? []).map((opt) => {
          const checked = selected.includes(opt);
          return (
            <label key={opt} className="flex items-center gap-2.5 cursor-pointer group">
              <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${checked ? "border-brand-accent bg-brand-accent" : "border-brand-border group-hover:border-brand-accent/60"}`}>
                {checked && <Check className="w-2.5 h-2.5 text-white" />}
              </div>
              <input
                type="checkbox"
                className="sr-only"
                checked={checked}
                onChange={() => onChange(checked ? selected.filter((s) => s !== opt) : [...selected, opt])}
              />
              <span className="text-sm text-brand-text">{opt}</span>
            </label>
          );
        })}
      </div>
    );
  }

  if (question.type === "textarea") {
    return (
      <textarea
        value={(value as string) ?? ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder={question.placeholder ?? ""}
        rows={3}
        className="w-full rounded-xl border border-brand-border/40 bg-brand-bg px-3 py-2 text-sm text-brand-text placeholder:text-brand-muted focus:outline-none focus:ring-1 focus:ring-brand-accent resize-none"
      />
    );
  }

  return (
    <input
      type="text"
      value={(value as string) ?? ""}
      onChange={(e) => onChange(e.target.value)}
      placeholder={question.placeholder ?? ""}
      className="w-full rounded-xl border border-brand-border/40 bg-brand-bg px-3 py-2 text-sm text-brand-text placeholder:text-brand-muted focus:outline-none focus:ring-1 focus:ring-brand-accent"
    />
  );
}

function formatAnswer(q: QuestionDef, value: unknown): string {
  if (Array.isArray(value)) return (value as string[]).join(", ") || "—";
  return (value as string) || "—";
}

export function QuestionForm({ form, onSubmit, disabled }: QuestionFormProps) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [submitted, setSubmitted] = useState(false);

  const isReview = step === form.questions.length;
  const currentQuestion = form.questions[step];

  const canAdvance = isReview
    ? true
    : !currentQuestion.required ||
      (Array.isArray(answers[currentQuestion.id])
        ? (answers[currentQuestion.id] as unknown[]).length > 0
        : !!(answers[currentQuestion.id] as string));

  const handleSubmit = () => {
    if (submitted) return;
    setSubmitted(true);
    onSubmit(form.tool_call_id, answers);
  };

  if (submitted) {
    return (
      <div className="rounded-2xl rounded-tl-sm bg-white border border-brand-border/20 shadow-sm p-3 text-sm">
        <p className="font-medium text-brand-text mb-2">{form.title}</p>
        <div className="space-y-1">
          {form.questions.map((q) => (
            <div key={q.id} className="flex gap-2">
              <span className="text-brand-muted shrink-0">{q.label}:</span>
              <span className="text-brand-text">{formatAnswer(q, answers[q.id])}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl rounded-tl-sm bg-white border border-brand-border/20 shadow-sm p-3 w-full">
      <p className="text-xs text-brand-muted mb-3">{form.title}</p>

      {isReview ? (
        <div className="space-y-2 mb-4">
          <p className="text-sm font-medium text-brand-text mb-2">Review your answers</p>
          {form.questions.map((q, i) => (
            <div key={q.id} className="flex items-start justify-between gap-2">
              <div>
                <p className="text-xs text-brand-muted">{q.label}</p>
                <p className="text-sm text-brand-text">{formatAnswer(q, answers[q.id])}</p>
              </div>
              <button onClick={() => setStep(i)} className="text-brand-muted hover:text-brand-accent shrink-0">
                <Edit2 className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="mb-4">
          <p className="text-sm font-medium text-brand-text mb-2">{currentQuestion.label}</p>
          <QuestionInput
            question={currentQuestion}
            value={answers[currentQuestion.id]}
            onChange={(val) => setAnswers((a) => ({ ...a, [currentQuestion.id]: val }))}
          />
        </div>
      )}

      <div className="flex items-center justify-between">
        <button
          onClick={() => setStep((s) => Math.max(0, s - 1))}
          disabled={step === 0}
          className="flex items-center gap-1 text-xs text-brand-muted hover:text-brand-text disabled:opacity-30 transition-colors"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          Back
        </button>
        <span className="text-xs text-brand-muted">
          {isReview ? "Review" : `${step + 1} / ${form.questions.length}`}
        </span>
        {isReview ? (
          <button
            onClick={handleSubmit}
            disabled={disabled}
            className="flex items-center gap-1 text-xs font-medium bg-brand-accent text-white px-3 py-1.5 rounded-lg hover:bg-brand-accent/90 disabled:opacity-50 transition-colors"
          >
            <Check className="w-3.5 h-3.5" />
            Submit
          </button>
        ) : (
          <button
            onClick={() => setStep((s) => s + 1)}
            disabled={!canAdvance}
            className="flex items-center gap-1 text-xs font-medium text-brand-accent hover:text-brand-accent/80 disabled:opacity-30 transition-colors"
          >
            {step === form.questions.length - 1 ? "Review" : "Next"}
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Replace the placeholder question form in `AICopilotPanel.tsx`**

Find the comment `{/* Question form placeholder — wired in Task 10 */}` block and replace:

```tsx
        {stream.questionForm && (
          <div className="flex justify-start">
            <div className="max-w-[90%] w-full">
              <QuestionForm
                form={stream.questionForm}
                onSubmit={submitToolResult}
                disabled={stream.isStreaming}
              />
            </div>
          </div>
        )}
```

Also add the import at the top of `AICopilotPanel.tsx`:

```tsx
import { QuestionForm } from "./QuestionForm";
```

- [ ] **Step 4: Test the question widget**

In the AI bubble, type: `"Ask me 2 questions before creating a campaign update"`. The AI should call `ask_user_questions`, and the question form widget should appear. Fill it out, hit Submit — the AI should continue.

- [ ] **Step 5: Commit**

```bash
git add backend/apps/copilot/tools.py backend/apps/copilot/stream_service.py frontend/src/components/copilot/QuestionForm.tsx frontend/src/components/copilot/AICopilotPanel.tsx
git commit -m "feat: add ask_user_questions tool and QuestionForm widget"
```

---

## Phase 4 — AI Page & Sidebar

---

### Task 11: Add AI page and sidebar nav item

**Files:**
- Create: `frontend/src/pages/ai/AICopilotPage.tsx`
- Modify: `frontend/src/App.tsx`
- Modify: `frontend/src/components/layout/Sidebar.tsx`

- [ ] **Step 1: Create `frontend/src/pages/ai/AICopilotPage.tsx`**

```tsx
import { AICopilotPanel } from "@/components/copilot/AICopilotPanel";

export function AICopilotPage() {
  return (
    <div className="h-[calc(100vh-var(--topbar-height))] overflow-hidden">
      <AICopilotPanel fullPage />
    </div>
  );
}
```

- [ ] **Step 2: Add the route in `frontend/src/App.tsx`**

Inside the `<Route element={<AppLayout />}>` group, add after the `/chat` route:

```tsx
<Route path="/ai" element={<AICopilotPage />} />
```

Also add the import at the top with other page imports:

```tsx
import { AICopilotPage } from "@/pages/ai/AICopilotPage";
```

- [ ] **Step 3: Add nav item in `frontend/src/components/layout/Sidebar.tsx`**

In the `NAV_ITEMS` array, add after the `Chat` entry:

```typescript
  { label: "AI Assistant", path: "/ai", icon: "Sparkles" },
```

- [ ] **Step 4: Verify the page loads**

Navigate to `http://localhost:5173/ai`. The full-page layout should show the conversation list on the left and the chat area on the right. The floating bubble should still appear.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/ai/AICopilotPage.tsx frontend/src/App.tsx frontend/src/components/layout/Sidebar.tsx
git commit -m "feat: add dedicated AI Assistant page and sidebar nav item"
```

---

## Phase 5 — Signup Enrichment

---

### Task 12: Add model fields and migrations

**Files:**
- Modify: `backend/apps/users/models.py`
- Modify: `backend/apps/startups/models.py`

- [ ] **Step 1: Add fields to `UserProfile` in `backend/apps/users/models.py`**

After `rejection_reason = models.TextField(...)`, add:

```python
    identity_document_url = models.URLField(max_length=500, null=True, blank=True)
    company_document_url = models.URLField(max_length=500, null=True, blank=True)
    date_of_birth = models.DateField(null=True, blank=True)
    id_number = models.CharField(max_length=50, null=True, blank=True)
```

- [ ] **Step 2: Add fields to `Startup` in `backend/apps/startups/models.py`**

After `website = models.URLField(...)`, add:

```python
    registration_id = models.CharField(max_length=100, blank=True, default="")
    legal_form = models.CharField(max_length=50, blank=True, default="")
```

- [ ] **Step 3: Generate and apply migrations**

```bash
docker compose exec django-api python manage.py makemigrations users --name add_document_fields
docker compose exec django-api python manage.py makemigrations startups --name add_registration_fields
docker compose exec django-api python manage.py migrate
```

Expected: both migrations created and applied without errors.

- [ ] **Step 4: Commit**

```bash
git add backend/apps/users/models.py backend/apps/startups/models.py backend/apps/users/migrations/ backend/apps/startups/migrations/
git commit -m "feat: add document URL and identity fields to UserProfile and Startup"
```

---

### Task 13: Create the document extraction endpoint

**Files:**
- Create: `backend/apps/users/extract.py`
- Modify: `backend/apps/users/views.py`
- Modify: `backend/apps/users/urls.py`

- [ ] **Step 1: Create `backend/apps/users/extract.py`**

```python
import base64
import io
import json
import mimetypes
import uuid

import pdfplumber
import requests
from django.conf import settings
from openai import AsyncOpenAI


INVESTOR_FIELDS = ["full_name", "date_of_birth", "id_number", "nationality"]
STARTUP_FIELDS = ["company_name", "registration_id", "formation_date", "legal_form"]

ARABIC_NOTE = (
    "The document may be in Arabic or French. "
    "Transliterate all Arabic names and values into Latin script "
    "(e.g., بن صالح → Ben Saleh, محمد → Mohamed). "
    "Return all fields in Latin script regardless of source language. "
    "For dates, use ISO format YYYY-MM-DD."
)


def _build_extract_prompt(doc_type: str, text: str | None) -> str:
    fields = INVESTOR_FIELDS if doc_type == "investor" else STARTUP_FIELDS
    field_list = ", ".join(f"`{f}`" for f in fields)
    base = (
        f"Extract the following fields from this identity document: {field_list}.\n"
        f"{ARABIC_NOTE}\n"
        "Return a JSON object with exactly these keys. "
        "If a field cannot be found, set it to null. "
        "Do not include any explanation, only the JSON object."
    )
    if text:
        return f"{base}\n\nDocument text:\n{text}"
    return base


async def _call_ai(prompt: str, image_b64: str | None, mime_type: str | None) -> dict:
    client = AsyncOpenAI(
        api_key=settings.AI_API_KEY,
        base_url=settings.AI_BASE_URL,
    )
    if image_b64:
        model = settings.AI_VISION_MODEL
        content = [
            {"type": "image_url", "image_url": {"url": f"data:{mime_type};base64,{image_b64}"}},
            {"type": "text", "text": prompt},
        ]
    else:
        model = settings.AI_MODEL
        content = prompt

    response = await client.chat.completions.create(
        model=model,
        messages=[{"role": "user", "content": content}],
        max_tokens=400,
    )
    raw = response.choices[0].message.content or "{}"
    raw = raw.strip().removeprefix("```json").removeprefix("```").removesuffix("```").strip()
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        return {}


def _upload_document(file_bytes: bytes, filename: str, user_id: str, doc_type: str) -> str:
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else "bin"
    folder = "identity" if doc_type == "investor" else "company"
    path = f"{user_id}/{folder}.{ext}"
    mime_type, _ = mimetypes.guess_type(filename)
    url = f"{settings.SUPABASE_URL}/storage/v1/object/user-documents/{path}"
    resp = requests.post(
        url,
        headers={
            "Authorization": f"Bearer {settings.SUPABASE_SERVICE_ROLE_KEY}",
            "Content-Type": mime_type or "application/octet-stream",
        },
        data=file_bytes,
        timeout=30,
    )
    resp.raise_for_status()
    return f"{settings.SUPABASE_URL}/storage/v1/object/public/user-documents/{path}"


def _confidence(extracted: dict, doc_type: str) -> str:
    fields = INVESTOR_FIELDS if doc_type == "investor" else STARTUP_FIELDS
    found = sum(1 for f in fields if extracted.get(f))
    ratio = found / len(fields)
    if ratio >= 0.75:
        return "high"
    if ratio >= 0.4:
        return "partial"
    return "low"


async def extract_document(file_bytes: bytes, filename: str, doc_type: str, user_id: str) -> dict:
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""

    image_b64 = None
    mime_type = None
    text = None

    if ext == "pdf":
        with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
            pages_text = []
            for page in pdf.pages:
                page_text = page.extract_text()
                if page_text:
                    pages_text.append(page_text)
            text = "\n\n".join(pages_text)
    else:
        mime_type, _ = mimetypes.guess_type(filename)
        mime_type = mime_type or "image/jpeg"
        image_b64 = base64.b64encode(file_bytes).decode("utf-8")

    prompt = _build_extract_prompt(doc_type, text)
    extracted = await _call_ai(prompt, image_b64, mime_type)

    from asgiref.sync import sync_to_async
    document_url = await sync_to_async(_upload_document)(file_bytes, filename, user_id, doc_type)

    return {
        "extracted": extracted,
        "confidence": _confidence(extracted, doc_type),
        "document_url": document_url,
    }
```

- [ ] **Step 2: Add `ExtractDocumentView` to `backend/apps/users/views.py`**

At the bottom of `views.py`, add:

```python
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt


@csrf_exempt
async def extract_document_view(request):
    if not request.user.is_authenticated:
        return JsonResponse({"error": "Unauthorized"}, status=401)
    if request.method != "POST":
        return JsonResponse({"error": "Method not allowed"}, status=405)

    doc_type = request.GET.get("type", "")
    if doc_type not in ("investor", "startup"):
        return JsonResponse({"error": "type must be 'investor' or 'startup'"}, status=400)

    file = request.FILES.get("file")
    if not file:
        return JsonResponse({"error": "file is required"}, status=400)
    if file.size > 20 * 1024 * 1024:
        return JsonResponse({"error": "File too large (max 20MB)"}, status=400)

    from asgiref.sync import sync_to_async
    from apps.users.extract import extract_document

    file_bytes = await sync_to_async(file.read)()
    result = await extract_document(file_bytes, file.name, doc_type, str(request.user.id))
    return JsonResponse(result)
```

- [ ] **Step 3: Register the URL in `backend/apps/users/urls.py`**

Add at the top of `urlpatterns`:

```python
    path("extract-document/", views.extract_document_view, name="extract-document"),
```

- [ ] **Step 4: Commit**

```bash
git add backend/apps/users/extract.py backend/apps/users/views.py backend/apps/users/urls.py
git commit -m "feat: add document extraction endpoint with pdfplumber and vision model"
```

---

### Task 14: Create `DocumentUploadStep` and update onboarding

**Files:**
- Create: `frontend/src/components/onboarding/DocumentUploadStep.tsx`
- Modify: `frontend/src/pages/onboarding/OnboardingPage.tsx`

- [ ] **Step 1: Create `frontend/src/components/onboarding/DocumentUploadStep.tsx`**

```tsx
import { useState, useCallback, useRef } from "react";
import { Upload, FileText, CheckCircle, AlertTriangle } from "lucide-react";
import { supabase } from "@/lib/supabase";

interface ExtractedFields {
  [key: string]: string | null;
}

interface ExtractionResult {
  extracted: ExtractedFields;
  confidence: "high" | "partial" | "low";
  document_url: string;
}

interface DocumentUploadStepProps {
  docType: "investor" | "startup";
  title: string;
  description: string;
  onExtracted: (result: ExtractionResult) => void;
  isComplete: boolean;
}

async function uploadAndExtract(
  file: File,
  docType: "investor" | "startup",
  token: string,
): Promise<ExtractionResult> {
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch(`/api/users/extract-document/?type=${docType}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });
  if (!res.ok) throw new Error(`Extraction failed: ${res.status}`);
  return res.json();
}

export function DocumentUploadStep({
  docType,
  title,
  description,
  onExtracted,
  isComplete,
}: DocumentUploadStepProps) {
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<ExtractionResult | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const processFile = useCallback(async (file: File) => {
    setError("");
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("Not authenticated");
      const extracted = await uploadAndExtract(file, docType, session.access_token);
      setResult(extracted);
      onExtracted(extracted);
    } catch (e) {
      setError("Failed to process document. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [docType, onExtracted]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }, [processFile]);

  const fieldCount = result ? Object.values(result.extracted).filter(Boolean).length : 0;

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-semibold text-brand-text">{title}</h3>
        <p className="text-sm text-brand-muted mt-1">{description}</p>
      </div>

      {result ? (
        <div className="space-y-3">
          <div className={`flex items-start gap-2 px-3 py-2.5 rounded-xl text-sm ${result.confidence === "low" ? "bg-amber-50 text-amber-700 border border-amber-200" : "bg-green-50 text-green-700 border border-green-200"}`}>
            {result.confidence === "low" ? (
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            ) : (
              <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" />
            )}
            <span>
              {result.confidence === "low"
                ? "We couldn't read everything clearly — please check the fields below."
                : `We found ${fieldCount} field${fieldCount !== 1 ? "s" : ""} — review and edit below.`}
            </span>
          </div>
          <button
            onClick={() => { setResult(null); onExtracted({ extracted: {}, confidence: "low", document_url: "" }); }}
            className="text-xs text-brand-muted hover:text-brand-text underline"
          >
            Upload a different document
          </button>
        </div>
      ) : (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          onClick={() => !loading && inputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${dragging ? "border-brand-accent bg-brand-accent/5" : "border-brand-border/40 hover:border-brand-accent/50 hover:bg-brand-accent/5"} ${loading ? "pointer-events-none opacity-60" : ""}`}
        >
          {loading ? (
            <div className="flex flex-col items-center gap-2">
              <div className="w-8 h-8 rounded-full border-2 border-brand-accent border-t-transparent animate-spin" />
              <p className="text-sm text-brand-muted">Reading document…</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <div className="w-10 h-10 rounded-full bg-brand-accent/10 flex items-center justify-center">
                {dragging ? <FileText className="w-5 h-5 text-brand-accent" /> : <Upload className="w-5 h-5 text-brand-accent" />}
              </div>
              <p className="text-sm font-medium text-brand-text">
                {dragging ? "Drop here" : "Upload document"}
              </p>
              <p className="text-xs text-brand-muted">Drag & drop or click — JPG, PNG, PDF up to 20MB</p>
            </div>
          )}
        </div>
      )}

      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}

      <input ref={inputRef} type="file" accept="image/*,.pdf" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) processFile(f); e.target.value = ""; }} />
    </div>
  );
}
```

- [ ] **Step 2: Update `frontend/src/pages/onboarding/OnboardingPage.tsx`**

Add the import at the top:

```tsx
import { DocumentUploadStep } from "@/components/onboarding/DocumentUploadStep";
```

Update `INVESTOR_STEPS` to add the document step at the start:

```typescript
const INVESTOR_STEPS = [
  { key: "document", label: "Identity" },
  { key: "profile", label: "Profile" },
  { key: "background", label: "Background" },
  { key: "preferences", label: "Preferences" },
  { key: "accreditation", label: "Accreditation" },
];
```

Update `FOUNDER_STEPS` to add the document step before the startup step:

```typescript
const FOUNDER_STEPS = [
  { key: "profile", label: "Profile" },
  { key: "document", label: "Company Doc" },
  { key: "startup", label: "Your Startup" },
  { key: "details", label: "Details" },
  { key: "pitch_deck", label: "Pitch Deck" },
];
```

Add document extraction state to the `data` state (after `startup_pitch_deck_url`):

```typescript
    document_url: "",
    identity_document_url: "",
    company_document_url: "",
    date_of_birth: "",
    id_number: "",
    startup_registration_id: "",
    startup_legal_form: "",
    document_step_complete: false,
```

Add a handler for document extraction results after `updateField`:

```typescript
  const handleInvestorDocExtracted = (result: { extracted: Record<string, string | null>; confidence: string; document_url: string }) => {
    setData((prev) => ({
      ...prev,
      identity_document_url: result.document_url || prev.identity_document_url,
      full_name: result.extracted.full_name || prev.full_name || "",
      date_of_birth: result.extracted.date_of_birth || prev.date_of_birth,
      id_number: result.extracted.id_number || prev.id_number,
      document_step_complete: !!result.document_url,
    }));
  };

  const handleStartupDocExtracted = (result: { extracted: Record<string, string | null>; confidence: string; document_url: string }) => {
    setData((prev) => ({
      ...prev,
      company_document_url: result.document_url || prev.company_document_url,
      startup_name: result.extracted.company_name || prev.startup_name,
      startup_founding_date: result.extracted.formation_date || prev.startup_founding_date,
      startup_registration_id: result.extracted.registration_id || prev.startup_registration_id,
      startup_legal_form: result.extracted.legal_form || prev.startup_legal_form,
      document_step_complete: !!result.document_url,
    }));
  };
```

Update `saveInvestorStep` to save document URL and new fields at step 1 (background):

```typescript
    } else if (currentStep === 2) {  // was step 1 before
      await api.patch("/users/me/", {
        company: data.company,
        job_title: data.job_title,
        linkedin_url: data.linkedin_url,
        date_of_birth: data.date_of_birth || null,
        id_number: data.id_number || null,
        identity_document_url: data.identity_document_url || null,
      });
```

Update `saveFounderStep` at completion to include new fields:

```typescript
          const payload: Record<string, unknown> = {
            name: data.startup_name,
            description: data.startup_description,
            industry: data.startup_industry,
            location: data.startup_location,
            founding_date: data.startup_founding_date,
            website: data.startup_website,
            registration_id: data.startup_registration_id || "",
            legal_form: data.startup_legal_form || "",
          };
```

Also save `company_document_url` at completion:

```typescript
          await api.patch("/users/me/", { company_document_url: data.company_document_url || null });
```

Update `renderStep` to include the document steps:

```typescript
  // Document step is step 0 for investor, step 1 for founder (after Profile)
  const renderStep = () => {
    if (isInvestor) {
      switch (step) {
        case 0:
          return (
            <DocumentUploadStep
              docType="investor"
              title="Verify your identity"
              description="We'll read your document and fill in the form for you. Works with Arabic and Latin documents."
              onExtracted={handleInvestorDocExtracted}
              isComplete={data.document_step_complete}
            />
          );
        case 1: return <ProfileStep data={data} onChange={updateField} />;
        case 2: return <InvestorBackgroundStep data={data} onChange={updateField} />;
        case 3: return <InvestorPreferencesStep data={data} onChange={updateField} />;
        case 4: return <InvestorAccreditationStep data={data} onChange={updateField} />;
        default: return null;
      }
    } else {
      switch (step) {
        case 0: return <ProfileStep data={data} onChange={updateField} />;
        case 1:
          return (
            <DocumentUploadStep
              docType="startup"
              title="Upload company document"
              description="We'll read your document and fill in the form for you. Works with Arabic and Latin documents."
              onExtracted={handleStartupDocExtracted}
              isComplete={data.document_step_complete}
            />
          );
        case 2: return <FounderStartupStep data={data} onChange={updateField} />;
        case 3: return <FounderDetailsStep data={data} onChange={updateField} />;
        case 4: return <FounderPitchDeckStep data={data} onChange={updateField} />;
        default: return null;
      }
    }
  };
```

Update `isNextDisabled` to block document steps until complete:

```typescript
  const isDocumentStep = (isInvestor && step === 0) || (!isInvestor && step === 1);
  const isNextDisabled =
    (isDocumentStep && !data.document_step_complete) ||
    (!isInvestor && step === 2 && !data.startup_name.trim());
```

Remove the `Skip for now` button entirely (it was already conditionally shown; now just remove the `handleSkip` call and the skip button from the render):

```tsx
              {/* Remove the Skip for now button entirely */}
              <div className="flex items-center justify-between pt-2">
                <div>
                  {step > 0 && (
                    <Button variant="ghost" onClick={handleBack}>Back</Button>
                  )}
                </div>
                <Button onClick={handleNext} loading={saving} disabled={isNextDisabled}>
                  {isLastStep ? "Complete Setup" : "Next"}
                </Button>
              </div>
```

- [ ] **Step 3: Update `InvestorBackgroundStep` to show new fields**

Open `frontend/src/pages/onboarding/steps/InvestorBackgroundStep.tsx`. Add the `date_of_birth` and `id_number` fields after the LinkedIn URL field:

```tsx
      <div>
        <label className="block text-sm font-medium text-brand-text mb-1.5">Date of Birth</label>
        <input
          type="date"
          value={data.date_of_birth || ""}
          onChange={(e) => onChange("date_of_birth", e.target.value)}
          className="w-full rounded-xl border border-brand-border/40 bg-brand-bg px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-brand-accent"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-brand-text mb-1.5">ID / CIN Number</label>
        <input
          type="text"
          value={data.id_number || ""}
          onChange={(e) => onChange("id_number", e.target.value)}
          placeholder="e.g. 12345678"
          className="w-full rounded-xl border border-brand-border/40 bg-brand-bg px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-brand-accent"
        />
      </div>
```

- [ ] **Step 4: Update `FounderStartupStep` to show new fields**

Open `frontend/src/pages/onboarding/steps/FounderStartupStep.tsx`. Add `registration_id` and `legal_form` fields after the founding date:

```tsx
      <div>
        <label className="block text-sm font-medium text-brand-text mb-1.5">Registration ID</label>
        <input
          type="text"
          value={data.startup_registration_id || ""}
          onChange={(e) => onChange("startup_registration_id", e.target.value)}
          placeholder="Company registration number"
          className="w-full rounded-xl border border-brand-border/40 bg-brand-bg px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-brand-accent"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-brand-text mb-1.5">Legal Form</label>
        <input
          type="text"
          value={data.startup_legal_form || ""}
          onChange={(e) => onChange("startup_legal_form", e.target.value)}
          placeholder="e.g. SARL, SA, SAS"
          className="w-full rounded-xl border border-brand-border/40 bg-brand-bg px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-brand-accent"
        />
      </div>
```

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/onboarding/DocumentUploadStep.tsx frontend/src/pages/onboarding/OnboardingPage.tsx frontend/src/pages/onboarding/steps/InvestorBackgroundStep.tsx frontend/src/pages/onboarding/steps/FounderStartupStep.tsx
git commit -m "feat: add document upload and extraction to investor and startup onboarding"
```

---

### Task 15: Admin document visibility

**Files:**
- Modify: admin users detail view (find where user details are rendered in `frontend/src/pages/`)

- [ ] **Step 1: Find the admin user detail component**

```bash
grep -r "identity_document\|UserDetail\|user detail\|AdminUser" frontend/src/pages/ --include="*.tsx" -l
```

- [ ] **Step 2: Add a Documents section to the user detail view**

In the admin user detail component, add after the user profile fields:

```tsx
{/* Documents section */}
{(user.identity_document_url || user.company_document_url) && (
  <div className="mt-4 pt-4 border-t border-brand-border/20">
    <h4 className="text-sm font-semibold text-brand-text mb-3">Verification Documents</h4>
    <div className="space-y-2">
      {user.identity_document_url && (
        <div className="flex items-center justify-between py-2 px-3 rounded-xl bg-brand-bg border border-brand-border/30">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-brand-accent" />
            <span className="text-sm text-brand-text">Identity Document</span>
          </div>
          <a
            href={user.identity_document_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-brand-accent hover:underline"
          >
            View
          </a>
        </div>
      )}
      {user.company_document_url && (
        <div className="flex items-center justify-between py-2 px-3 rounded-xl bg-brand-bg border border-brand-border/30">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-brand-accent" />
            <span className="text-sm text-brand-text">Company Document</span>
          </div>
          <a
            href={user.company_document_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-brand-accent hover:underline"
          >
            View
          </a>
        </div>
      )}
    </div>
  </div>
)}
```

Add `identity_document_url` and `company_document_url` to the `AdminUserSerializer` in `backend/apps/users/serializers.py` so they are included in the API response:

```python
# In AdminUserSerializer Meta.fields, add:
"identity_document_url", "company_document_url", "date_of_birth", "id_number",
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/ backend/apps/users/serializers.py
git commit -m "feat: show uploaded documents in admin user detail view"
```

---

## Final Verification Checklist

- [ ] SSE streaming works end-to-end: send message → text streams token by token
- [ ] Thinking block appears and shows "Thought for X seconds" when done
- [ ] Tool execution block appears above AI bubble with full result
- [ ] Question form renders, back/next/review works, submit resumes AI
- [ ] File drag-and-drop works; image preview and PDF pill display correctly
- [ ] Example prompts appear on new conversations and send on click
- [ ] `/ai` page loads with side-by-side layout; bubble still works everywhere
- [ ] Investor onboarding shows document step (required), extraction pre-fills fields
- [ ] Startup onboarding shows document step (required), extraction pre-fills fields
- [ ] Admin can see document links in user detail view
- [ ] All Docker containers restart cleanly after the changes
