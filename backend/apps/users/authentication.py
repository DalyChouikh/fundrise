import logging
from uuid import UUID

import jwt
from django.conf import settings
from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import AuthenticationFailed

from apps.users.models import UserProfile

logger = logging.getLogger(__name__)


class SupabaseJWTAuthentication(BaseAuthentication):
    """
    DRF authentication backend that validates Supabase JWT tokens.

    Expects: Authorization: Bearer <supabase-jwt-token>
    Returns: (UserProfile, decoded_payload)
    """

    keyword = "Bearer"

    def authenticate(self, request):
        auth_header = request.META.get("HTTP_AUTHORIZATION")
        if not auth_header:
            return None

        parts = auth_header.split()
        if len(parts) != 2 or parts[0] != self.keyword:
            return None

        token = parts[1]
        payload = self._decode_token(token)
        user = self._get_or_create_user(payload)
        return (user, payload)

    def authenticate_header(self, request):
        return self.keyword

    def _decode_token(self, token):
        jwt_secret = settings.SUPABASE_JWT_SECRET
        if not jwt_secret:
            logger.error("SUPABASE_JWT_SECRET is not configured")
            raise AuthenticationFailed("Authentication service is misconfigured.")

        try:
            payload = jwt.decode(
                token,
                jwt_secret,
                algorithms=["HS256"],
                audience="authenticated",
            )
        except jwt.ExpiredSignatureError:
            raise AuthenticationFailed("Token has expired.")
        except jwt.InvalidAudienceError:
            raise AuthenticationFailed("Invalid token audience.")
        except jwt.InvalidTokenError as e:
            logger.warning("JWT decode failed: %s", str(e))
            raise AuthenticationFailed("Invalid token.")

        return payload

    def _get_or_create_user(self, payload):
        try:
            supabase_uid = UUID(payload["sub"])
        except (KeyError, ValueError):
            raise AuthenticationFailed("Token missing valid 'sub' claim.")

        email = payload.get("email", "")
        user_metadata = payload.get("user_metadata", {})
        full_name = user_metadata.get("full_name", "")
        role = user_metadata.get("role", UserProfile.Role.INVESTOR)

        valid_roles = {choice[0] for choice in UserProfile.Role.choices}
        if role not in valid_roles:
            role = UserProfile.Role.INVESTOR

        user, created = UserProfile.objects.get_or_create(
            id=supabase_uid,
            defaults={
                "email": email,
                "full_name": full_name,
                "role": role,
            },
        )

        if created:
            logger.info("Auto-created UserProfile for %s (%s)", email, supabase_uid)
        elif user.email != email and email:
            user.email = email
            user.save(update_fields=["email"])

        return user
