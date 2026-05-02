import json

from rest_framework import serializers

from apps.copilot.models import CopilotConversation, CopilotMessage

_HIDDEN_TOOLS = {"ask_user_questions"}


class CopilotMessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = CopilotMessage
        fields = ["id", "role", "content", "media_url", "media_type", "thinking_content", "thinking_duration", "created_at"]
        read_only_fields = fields


class CopilotConversationListSerializer(serializers.ModelSerializer):
    last_message = serializers.SerializerMethodField()

    class Meta:
        model = CopilotConversation
        fields = ["id", "title", "last_message", "created_at", "updated_at"]
        read_only_fields = fields

    def get_last_message(self, obj):
        msg = (
            obj.messages.filter(role__in=["user", "assistant"], tool_calls__isnull=True)
            .order_by("-created_at")
            .first()
        )
        if msg:
            return CopilotMessageSerializer(msg).data
        return None


class CopilotConversationDetailSerializer(serializers.ModelSerializer):
    messages = serializers.SerializerMethodField()

    class Meta:
        model = CopilotConversation
        fields = ["id", "title", "messages", "created_at", "updated_at"]
        read_only_fields = fields

    def get_messages(self, obj):  # noqa: C901
        all_msgs = list(
            obj.messages.filter(role__in=["user", "assistant", "tool"])
            .order_by("created_at")
        )
        result = []
        i = 0
        while i < len(all_msgs):
            msg = all_msgs[i]

            if msg.role == "tool":
                i += 1
                continue

            if msg.role == "user":
                result.append(CopilotMessageSerializer(msg).data)
                i += 1
                continue

            # --- assistant turn: collect all tool calls + final text ---
            thinking_content = None
            thinking_duration = None
            tool_calls_out = []
            final_content = ""
            final_id = msg.id
            final_created_at = msg.created_at

            while i < len(all_msgs) and all_msgs[i].role == "assistant":
                asst = all_msgs[i]

                if not thinking_content and asst.thinking_content:
                    thinking_content = asst.thinking_content
                    thinking_duration = asst.thinking_duration

                if asst.tool_calls:
                    # Collect the tool results that immediately follow
                    j = i + 1
                    tool_result_map: dict = {}
                    while j < len(all_msgs) and all_msgs[j].role == "tool":
                        tr = all_msgs[j]
                        try:
                            tool_result_map[tr.tool_name] = json.loads(tr.content)
                        except (json.JSONDecodeError, TypeError):
                            tool_result_map[tr.tool_name] = tr.content
                        j += 1

                    for tc in asst.tool_calls:
                        name = tc["function"]["name"]
                        if name in _HIDDEN_TOOLS:
                            continue
                        try:
                            args = json.loads(tc["function"]["arguments"])
                        except (json.JSONDecodeError, TypeError):
                            args = {}
                        tool_calls_out.append({
                            "tool_call_id": tc["id"],
                            "tool_name": name,
                            "input": args,
                            "result": tool_result_map.get(tc["id"]),
                        })

                    final_id = asst.id
                    final_created_at = asst.created_at
                    i = j
                else:
                    # Final text response — end of this AI turn
                    final_content = asst.content
                    final_id = asst.id
                    final_created_at = asst.created_at
                    if not thinking_content and asst.thinking_content:
                        thinking_content = asst.thinking_content
                        thinking_duration = asst.thinking_duration
                    i += 1
                    break

            result.append({
                "id": final_id,
                "role": "assistant",
                "content": final_content,
                "media_url": None,
                "media_type": None,
                "thinking_content": thinking_content,
                "thinking_duration": thinking_duration,
                "tool_calls": tool_calls_out,
                "created_at": final_created_at.isoformat(),
            })

        return result
