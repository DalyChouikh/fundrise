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
