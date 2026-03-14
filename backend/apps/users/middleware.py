import logging
from urllib.parse import parse_qs
from uuid import UUID

import jwt
from channels.db import database_sync_to_async
from channels.middleware import BaseMiddleware
from django.conf import settings

from apps.users.models import UserProfile

logger = logging.getLogger(__name__)


class SupabaseJWTWebSocketMiddleware(BaseMiddleware):
    """
    Django Channels middleware that authenticates WebSocket connections
    using Supabase JWT tokens passed as a query parameter.

    Usage: ws://host/ws/path/?token=<jwt-token>
    """

    async def __call__(self, scope, receive, send):
        scope["user"] = await self._authenticate(scope)
        return await super().__call__(scope, receive, send)

    async def _authenticate(self, scope):
        query_string = scope.get("query_string", b"").decode("utf-8")
        params = parse_qs(query_string)
        token_list = params.get("token", [])

        if not token_list:
            return None

        token = token_list[0]

        try:
            payload = jwt.decode(
                token,
                settings.SUPABASE_JWT_SECRET,
                algorithms=["HS256"],
                audience="authenticated",
            )
        except jwt.InvalidTokenError as e:
            logger.warning("WebSocket JWT auth failed: %s", str(e))
            return None

        try:
            supabase_uid = UUID(payload["sub"])
        except (KeyError, ValueError):
            return None

        return await self._get_user(supabase_uid, payload)

    @database_sync_to_async
    def _get_user(self, supabase_uid, payload):
        email = payload.get("email", "")
        user_metadata = payload.get("user_metadata", {})
        full_name = user_metadata.get("full_name", "")
        role = user_metadata.get("role", UserProfile.Role.INVESTOR)

        valid_roles = {choice[0] for choice in UserProfile.Role.choices}
        if role not in valid_roles:
            role = UserProfile.Role.INVESTOR

        user, _ = UserProfile.objects.get_or_create(
            id=supabase_uid,
            defaults={
                "email": email,
                "full_name": full_name,
                "role": role,
            },
        )
        return user
