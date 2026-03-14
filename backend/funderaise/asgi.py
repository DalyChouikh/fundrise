import os

from channels.routing import ProtocolTypeRouter, URLRouter
from django.core.asgi import get_asgi_application

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "funderaise.settings")

django_asgi_app = get_asgi_application()

from apps.users.middleware import SupabaseJWTWebSocketMiddleware  # noqa: E402

application = ProtocolTypeRouter(
    {
        "http": django_asgi_app,
        "websocket": SupabaseJWTWebSocketMiddleware(
            URLRouter([])
        ),
    }
)
