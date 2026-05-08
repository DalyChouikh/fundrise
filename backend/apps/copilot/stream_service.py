import base64
import json
import mimetypes
import time
from typing import AsyncGenerator

import httpx

from apps.copilot.models import CopilotConversation, CopilotMessage
from apps.copilot.provider import get_provider

VISUAL_TOOL_NAMES = {"show_startup_cards", "show_campaign_cards", "render_chart"}


def _tool_name(tool_definition: dict) -> str:
    return tool_definition.get("function", {}).get("name", "")


def _tool_definitions_for_iteration(visual_content_rendered: bool) -> list:
    from apps.copilot.tools import TOOL_DEFINITIONS

    if not visual_content_rendered:
        return TOOL_DEFINITIONS
    return [
        tool
        for tool in TOOL_DEFINITIONS
        if _tool_name(tool) not in VISUAL_TOOL_NAMES
    ]


def _extract_reasoning_delta(delta) -> str:
    for attr in ("reasoning_content", "reasoning"):
        reasoning = getattr(delta, attr, None)
        if isinstance(reasoning, str) and reasoning:
            return reasoning

    details = getattr(delta, "reasoning_details", None) or []
    parts = []
    for detail in details:
        if isinstance(detail, dict):
            text = detail.get("text") or detail.get("summary")
        else:
            text = getattr(detail, "text", None) or getattr(detail, "summary", None)
        if isinstance(text, str) and text:
            parts.append(text)
    return "\n".join(parts)


def _is_card_block(value) -> bool:
    return (
        isinstance(value, dict)
        and value.get("card_type") in {"startup", "campaign"}
        and isinstance(value.get("items"), list)
    )


def _is_chart_block(value) -> bool:
    return (
        isinstance(value, dict)
        and value.get("chart_type") in {"bar", "line", "pie", "area"}
        and "error" not in value
        and isinstance(value.get("data"), list)
    )


def _visual_tool_ack(value) -> dict | None:
    if _is_card_block(value):
        return {"status": "displayed", "count": len(value.get("items", []))}
    if _is_chart_block(value):
        return {"status": "rendered", "chart_type": value["chart_type"]}
    return None


def _json_loads_or_none(value: str):
    try:
        return json.loads(value)
    except (json.JSONDecodeError, TypeError):
        return None


def _message_content_for_model(msg: CopilotMessage) -> str:
    parsed = _json_loads_or_none(msg.content)
    ack = _visual_tool_ack(parsed)
    if ack is not None:
        return json.dumps(ack, default=str)
    return msg.content


async def _fetch_supabase_bytes(url: str) -> bytes:
    from django.conf import settings
    headers = {}
    supabase_url = getattr(settings, "SUPABASE_URL", "")
    if supabase_url and url.startswith(supabase_url):
        headers["Authorization"] = f"Bearer {settings.SUPABASE_SERVICE_ROLE_KEY}"
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.get(url, headers=headers)
        resp.raise_for_status()
        return resp.content


async def _url_to_data_uri(url: str) -> str | None:
    try:
        raw = await _fetch_supabase_bytes(url)
        ext = url.rsplit(".", 1)[-1].lower() if "." in url else ""
        mime, _ = mimetypes.guess_type(f"file.{ext}")
        mime = mime or "image/jpeg"
        b64 = base64.b64encode(raw).decode("utf-8")
        return f"data:{mime};base64,{b64}"
    except Exception:
        return None


async def _extract_pdf_text(url: str) -> str | None:
    try:
        import io
        import pdfplumber
        raw = await _fetch_supabase_bytes(url)
        with pdfplumber.open(io.BytesIO(raw)) as pdf:
            pages = [page.extract_text() or "" for page in pdf.pages[:20]]
            text = "\n\n".join(p for p in pages if p.strip())
            return text or None
    except Exception:
        return None

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
                            "type": {
                                "type": "string",
                                "enum": ["radio", "checkbox", "text", "textarea", "select", "date", "number", "rating", "slider"],
                            },
                            "label": {"type": "string"},
                            "options": {"type": "array", "items": {"type": "string"}},
                            "placeholder": {"type": "string"},
                            "required": {"type": "boolean"},
                            "min":  {"type": "number", "description": "Minimum value (number, slider)"},
                            "max":  {"type": "number", "description": "Maximum value (number, slider)"},
                            "step": {"type": "number", "description": "Step increment (number, slider)"},
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
        "- Ask the user clarifying questions using the ask_user_questions tool\n"
        "- Search and browse startups by name, description, or industry category\n"
        "- Filter campaigns by industry when searching\n"
        "- Render startup or campaign cards visually using show_startup_cards / show_campaign_cards after fetching IDs\n"
        "- Render charts using render_chart after computing the data with other tools\n\n"
        "Guidelines:\n"
        "- Be concise and helpful\n"
        "- Use the available tools to fetch real data before answering data-related questions\n"
        "- Format currency values with $ signs and commas\n"
        "- Use ask_user_questions when you need specific details before taking an action\n"
        "- Never make up data — always use tools to verify\n"
        "- When showing lists, use clear formatting\n"
        "- After calling show_startup_cards, show_campaign_cards, or render_chart, add a brief 1–2 sentence text summary\n"
        "- IMPORTANT — Charts and visualizations: When the user asks about statistics, metrics, performance, "
        "dashboard, analytics, trends, comparisons, or 'how are my ...', you MUST fetch the data with "
        "read tools first (get_platform_stats, get_my_campaigns, get_my_investments, etc.), then call "
        "render_chart to visualize it. Always prefer a chart over raw numbers when the user is asking "
        "for an overview or summary of data. Choose bar for comparisons, line/area for trends over time, "
        "pie for proportions.\n\n"
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
                data_uri = await _url_to_data_uri(msg.media_url)
                image_url = data_uri if data_uri else msg.media_url
                messages.append({
                    "role": "user",
                    "content": [
                        {"type": "image_url", "image_url": {"url": image_url}},
                        {"type": "text", "text": msg.content or ""},
                    ],
                })
            else:
                text = msg.content or ""
                if msg.media_url and msg.media_type == "pdf":
                    pdf_text = await _extract_pdf_text(msg.media_url)
                    if pdf_text:
                        text = f"[PDF content]\n{pdf_text}\n\n[User message]\n{text}" if text else f"[PDF content]\n{pdf_text}"
                    else:
                        text = f"[PDF attached — could not extract text]\n{text}"
                messages.append({"role": "user", "content": text})
        elif msg.role == "assistant":
            if msg.tool_calls:
                assistant_message = {
                    "role": "assistant",
                    "content": msg.content or None,
                    "tool_calls": msg.tool_calls,
                }
                if msg.thinking_content:
                    assistant_message["reasoning"] = msg.thinking_content
                messages.append(assistant_message)
            else:
                assistant_message = {"role": "assistant", "content": msg.content}
                if msg.thinking_content:
                    assistant_message["reasoning"] = msg.thinking_content
                messages.append(assistant_message)
        elif msg.role == "tool":
            messages.append({
                "role": "tool",
                "tool_call_id": msg.tool_name,
                "content": _message_content_for_model(msg),
            })
    return messages


async def _run_stream_loop(
    user,
    conversation: CopilotConversation,
    messages: list,
    use_vision: bool = False,
) -> AsyncGenerator[tuple[str, dict], None]:
    from apps.copilot.tools import execute_tool
    from asgiref.sync import sync_to_async

    provider = get_provider()
    visual_content_rendered = False
    rendered_visual_signatures: set[str] = set()

    for _ in range(8):
        all_tools = [ASK_USER_QUESTIONS_DEFINITION] + _tool_definitions_for_iteration(
            visual_content_rendered
        )
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

            reasoning = _extract_reasoning_delta(delta)
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
            tool_calls_list = []
            for idx in sorted(tool_calls_acc.keys()):
                tc = tool_calls_acc[idx]
                tool_calls_list.append({
                    "id": tc["id"],
                    "type": "function",
                    "function": {"name": tc["name"], "arguments": tc["arguments"]},
                })

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

                is_visual_tool = tool_name in VISUAL_TOOL_NAMES
                visual_signature = None
                if is_visual_tool:
                    visual_signature = json.dumps(
                        {"tool_name": tool_name, "arguments": tool_args},
                        sort_keys=True,
                        default=str,
                    )
                    if visual_signature in rendered_visual_signatures:
                        content_to_model = json.dumps({
                            "status": "already_displayed",
                            "instruction": "Do not call this visual display tool again; provide the final text summary.",
                        })
                        await CopilotMessage.objects.acreate(
                            conversation=conversation,
                            role="tool",
                            content=content_to_model,
                            tool_name=tc["id"],
                        )
                        messages.append({
                            "role": "tool",
                            "tool_call_id": tc["id"],
                            "content": content_to_model,
                        })
                        continue
                else:
                    yield "tool_start", {
                        "tool_call_id": tc["id"],
                        "tool_name": tool_name,
                        "input": tool_args,
                    }

                result = await sync_to_async(execute_tool)(tool_name, user, tool_args)

                ack = _visual_tool_ack(result)
                if _is_card_block(result):
                    if result.get("items"):
                        yield "card_block", result
                    visual_content_rendered = True
                    if visual_signature is not None:
                        rendered_visual_signatures.add(visual_signature)
                    content_to_save = json.dumps(result, default=str)
                    content_to_model = json.dumps(ack, default=str)
                elif _is_chart_block(result):
                    yield "chart_block", result
                    visual_content_rendered = True
                    if visual_signature is not None:
                        rendered_visual_signatures.add(visual_signature)
                    content_to_save = json.dumps(result, default=str)
                    content_to_model = json.dumps(ack, default=str)
                else:
                    yield "tool_result", {"tool_call_id": tc["id"], "result": result}
                    content_to_save = json.dumps(result, default=str)
                    content_to_model = content_to_save

                await CopilotMessage.objects.acreate(
                    conversation=conversation,
                    role="tool",
                    content=content_to_save,
                    tool_name=tc["id"],
                )

                messages.append({
                    "role": "tool",
                    "tool_call_id": tc["id"],
                    "content": content_to_model,
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
