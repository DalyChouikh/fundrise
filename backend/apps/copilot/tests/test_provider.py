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
