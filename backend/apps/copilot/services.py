import json
import logging

from django.conf import settings
from openai import OpenAI

from apps.copilot.tools import TOOL_DEFINITIONS, execute_tool

logger = logging.getLogger(__name__)


def build_system_prompt(user):
    role_label = user.get_role_display() if hasattr(user, "get_role_display") else user.role
    return (
        "You are the Funderaise AI Copilot, an intelligent assistant for the "
        "Funderaise collaborative crowdfunding platform.\n\n"
        f"You are helping {user.full_name}, who is a {role_label} on the platform.\n\n"
        "Your capabilities:\n"
        "- Answer questions about the user's startups, campaigns, investments, and tasks\n"
        "- Provide platform statistics and insights\n"
        "- Help users understand their funding progress\n"
        "- Summarize notifications and recent activity\n\n"
        "Guidelines:\n"
        "- Be concise and helpful\n"
        "- Use the available tools to fetch real data before answering data-related questions\n"
        "- Format currency values with $ signs and commas\n"
        "- If you don't have enough information, ask clarifying questions\n"
        "- Never make up data — always use tools to verify\n"
        "- When showing lists, use clear formatting\n"
        "- Be encouraging about funding progress\n"
    )


def build_messages(conversation_messages):
    messages = []
    for msg in conversation_messages:
        if msg.role == "user":
            messages.append({"role": "user", "content": msg.content})
        elif msg.role == "assistant":
            messages.append({"role": "assistant", "content": msg.content})
    return messages


def chat_with_copilot(user, conversation, user_message_text):
    from apps.copilot.models import CopilotMessage

    # Save user message
    CopilotMessage.objects.create(
        conversation=conversation,
        role="user",
        content=user_message_text,
    )

    # Initialize client
    api_key = settings.GITHUB_MODELS_TOKEN
    if not api_key:
        return CopilotMessage.objects.create(
            conversation=conversation,
            role="assistant",
            content="AI Copilot is not configured. Please set the GITHUB_MODELS_TOKEN environment variable.",
        )

    client = OpenAI(
        base_url="https://models.inference.ai.azure.com",
        api_key=api_key,
    )

    # Build message history from DB
    all_db_messages = conversation.messages.order_by("created_at")
    messages = [
        {"role": "system", "content": build_system_prompt(user)},
        *build_messages(all_db_messages),
    ]

    max_iterations = 5
    for _ in range(max_iterations):
        try:
            response = client.chat.completions.create(
                model="gpt-4o-mini",
                messages=messages,
                tools=TOOL_DEFINITIONS,
            )
        except Exception as e:
            logger.exception("AI API call failed")
            error_str = str(e)
            if "429" in error_str or "rate" in error_str.lower():
                msg = "The AI service is temporarily rate-limited. Please wait a minute and try again."
            elif "401" in error_str or "403" in error_str:
                msg = "AI Copilot API key is invalid or expired. Please check the GITHUB_MODELS_TOKEN configuration."
            else:
                msg = "Sorry, I'm having trouble connecting to the AI service right now. Please try again later."
            return CopilotMessage.objects.create(
                conversation=conversation,
                role="assistant",
                content=msg,
            )

        choice = response.choices[0]

        if choice.finish_reason == "tool_calls" and choice.message.tool_calls:
            # Append assistant message with tool calls to conversation
            messages.append(choice.message.model_dump())

            # Execute each tool call
            for tool_call in choice.message.tool_calls:
                tool_name = tool_call.function.name
                try:
                    tool_args = json.loads(tool_call.function.arguments)
                except (json.JSONDecodeError, TypeError):
                    tool_args = {}

                # Convert float args to int where appropriate
                for key, val in tool_args.items():
                    if isinstance(val, float) and val == int(val):
                        tool_args[key] = int(val)

                result = execute_tool(tool_name, user, tool_args)

                messages.append({
                    "role": "tool",
                    "tool_call_id": tool_call.id,
                    "content": json.dumps(result, default=str),
                })

            continue
        else:
            # Final text response
            text = choice.message.content or ""
            return CopilotMessage.objects.create(
                conversation=conversation,
                role="assistant",
                content=text or "I processed your request but have no additional information to share.",
            )

    return CopilotMessage.objects.create(
        conversation=conversation,
        role="assistant",
        content="I apologize, but I'm having trouble processing your request right now. Please try again.",
    )
