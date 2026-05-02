from asgiref.sync import sync_to_async
from rest_framework.exceptions import AuthenticationFailed

from apps.users.authentication import SupabaseJWTAuthentication

_auth = SupabaseJWTAuthentication()


async def authenticate_async(request) -> None:
    """Run Supabase JWT auth on a plain async Django view and set request.user."""
    try:
        result = await sync_to_async(_auth.authenticate)(request)
        if result:
            request.user, _ = result
    except AuthenticationFailed:
        pass
