import json
from types import SimpleNamespace

from asgiref.sync import async_to_sync
from django.test import TestCase

from apps.copilot.models import CopilotConversation, CopilotMessage
from apps.copilot.serializers import CopilotConversationDetailSerializer
from apps.copilot.stream_service import (
    _build_messages,
    _extract_reasoning_delta,
    _tool_definitions_for_iteration,
)
from apps.users.models import UserProfile


def make_user(email="rich@test.com"):
    return UserProfile.objects.create(
        email=email,
        full_name="Rich Tester",
        role=UserProfile.Role.INVESTOR,
    )


def assistant_tool_call(tool_call_id, name, arguments):
    return {
        "id": tool_call_id,
        "type": "function",
        "function": {
            "name": name,
            "arguments": json.dumps(arguments),
        },
    }


class RichContentSerializerTest(TestCase):
    def test_serializes_persisted_card_and_chart_blocks_on_assistant_turn(self):
        user = make_user()
        conversation = CopilotConversation.objects.create(user=user)

        CopilotMessage.objects.create(
            conversation=conversation,
            role=CopilotMessage.Role.USER,
            content="show me fintech startups and chart them",
        )
        CopilotMessage.objects.create(
            conversation=conversation,
            role=CopilotMessage.Role.ASSISTANT,
            tool_calls=[
                assistant_tool_call("cards-1", "show_startup_cards", {"startup_ids": [1]}),
                assistant_tool_call(
                    "chart-1",
                    "render_chart",
                    {
                        "chart_type": "bar",
                        "title": "Funding",
                        "data": [{"label": "A", "value": 10}],
                    },
                ),
            ],
        )
        CopilotMessage.objects.create(
            conversation=conversation,
            role=CopilotMessage.Role.TOOL,
            tool_name="cards-1",
            content=json.dumps({
                "card_type": "startup",
                "items": [{"id": 1, "name": "Acme", "description": "FinTech"}],
            }),
        )
        CopilotMessage.objects.create(
            conversation=conversation,
            role=CopilotMessage.Role.TOOL,
            tool_name="chart-1",
            content=json.dumps({
                "chart_type": "bar",
                "title": "Funding",
                "data": [{"label": "A", "value": 10}],
            }),
        )
        CopilotMessage.objects.create(
            conversation=conversation,
            role=CopilotMessage.Role.ASSISTANT,
            content="Here are the results.",
            thinking_content="I should show cards and a chart.",
            thinking_duration=1.2,
        )

        data = CopilotConversationDetailSerializer(conversation).data

        assistant = data["messages"][1]
        self.assertEqual(assistant["content"], "Here are the results.")
        self.assertEqual(assistant["card_blocks"][0]["card_type"], "startup")
        self.assertEqual(assistant["chart_blocks"][0]["chart_type"], "bar")
        self.assertEqual(assistant["thinking_content"], "I should show cards and a chart.")
        self.assertEqual(assistant["tool_calls"], [])


class RichContentMessageContextTest(TestCase):
    def test_build_messages_feeds_visual_tool_ack_not_full_payload_to_model(self):
        user = make_user("context@test.com")
        conversation = CopilotConversation.objects.create(user=user)

        CopilotMessage.objects.create(
            conversation=conversation,
            role=CopilotMessage.Role.USER,
            content="show startups",
        )
        CopilotMessage.objects.create(
            conversation=conversation,
            role=CopilotMessage.Role.ASSISTANT,
            tool_calls=[assistant_tool_call("cards-1", "show_startup_cards", {"startup_ids": [1]})],
            thinking_content="Need to render the selected startup.",
        )
        CopilotMessage.objects.create(
            conversation=conversation,
            role=CopilotMessage.Role.TOOL,
            tool_name="cards-1",
            content=json.dumps({
                "card_type": "startup",
                "items": [{"id": 1, "name": "Acme"}],
            }),
        )

        messages = async_to_sync(_build_messages)(user, conversation)

        assistant = next(msg for msg in messages if msg["role"] == "assistant")
        tool = next(msg for msg in messages if msg["role"] == "tool")
        self.assertEqual(assistant["reasoning"], "Need to render the selected startup.")
        self.assertEqual(json.loads(tool["content"]), {"status": "displayed", "count": 1})


class VisualToolLoopGuardTest(TestCase):
    def test_visual_tools_are_removed_after_visual_content_has_rendered_this_turn(self):
        first_pass_tools = _tool_definitions_for_iteration(visual_content_rendered=False)
        second_pass_tools = _tool_definitions_for_iteration(visual_content_rendered=True)

        first_names = {tool["function"]["name"] for tool in first_pass_tools}
        second_names = {tool["function"]["name"] for tool in second_pass_tools}

        self.assertIn("show_startup_cards", first_names)
        self.assertIn("show_campaign_cards", first_names)
        self.assertIn("render_chart", first_names)
        self.assertNotIn("show_startup_cards", second_names)
        self.assertNotIn("show_campaign_cards", second_names)
        self.assertNotIn("render_chart", second_names)
        self.assertIn("search_startups", second_names)


class ReasoningExtractionTest(TestCase):
    def test_extracts_reasoning_content_field(self):
        delta = SimpleNamespace(reasoning_content="thinking", content=None)
        self.assertEqual(_extract_reasoning_delta(delta), "thinking")

    def test_extracts_reasoning_field(self):
        delta = SimpleNamespace(reasoning="thinking", content=None)
        self.assertEqual(_extract_reasoning_delta(delta), "thinking")

    def test_extracts_reasoning_details_text_and_summary(self):
        delta = SimpleNamespace(
            reasoning_details=[
                {"type": "reasoning.summary", "summary": "summary"},
                SimpleNamespace(type="reasoning.text", text="details"),
            ],
            content=None,
        )
        self.assertEqual(_extract_reasoning_delta(delta), "summary\ndetails")
