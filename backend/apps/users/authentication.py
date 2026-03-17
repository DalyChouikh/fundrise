import logging
from uuid import UUID

import jwt
from jwt import PyJWKClient
from django.conf import settings
from django.db import IntegrityError
from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import AuthenticationFailed

from apps.users.models import UserProfile

logger = logging.getLogger(__name__)

# Module-level JWKS client with built-in caching (lifespan=300s by default)
_jwks_client = None


def _get_jwks_client():
    global _jwks_client
    if _jwks_client is None:
        supabase_url = settings.SUPABASE_URL.rstrip("/")
        jwks_url = f"{supabase_url}/auth/v1/.well-known/jwks.json"
        _jwks_client = PyJWKClient(jwks_url, cache_keys=True, lifespan=300)
    return _jwks_client


class SupabaseJWTAuthentication(BaseAuthentication):
    """
    DRF authentication backend that validates Supabase JWT tokens.

    Supports both asymmetric (ES256 via JWKS) and symmetric (HS256) signing.
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
        try:
            header = jwt.get_unverified_header(token)
        except jwt.InvalidTokenError as e:
            logger.warning("JWT header decode failed: %s", str(e))
            raise AuthenticationFailed("Invalid token.")

        alg = header.get("alg", "")

        try:
            if alg.startswith("ES") or alg.startswith("RS") or alg.startswith("PS"):
                # Asymmetric algorithm — use JWKS public key
                signing_key = _get_jwks_client().get_signing_key_from_jwt(token)
                payload = jwt.decode(
                    token,
                    signing_key.key,
                    algorithms=[alg],
                    audience="authenticated",
                )
            else:
                # Symmetric algorithm (HS256/HS384/HS512) — use shared secret
                jwt_secret = settings.SUPABASE_JWT_SECRET
                if not jwt_secret:
                    logger.error("SUPABASE_JWT_SECRET is not configured")
                    raise AuthenticationFailed(
                        "Authentication service is misconfigured."
                    )
                payload = jwt.decode(
                    token,
                    jwt_secret,
                    algorithms=["HS256", "HS384", "HS512"],
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
        role = user_metadata.get("role", "")

        valid_roles = {choice[0] for choice in UserProfile.Role.choices}
        has_explicit_role = role in valid_roles
        if not has_explicit_role:
            role = UserProfile.Role.INVESTOR

        try:
            user, created = UserProfile.objects.get_or_create(
                id=supabase_uid,
                defaults={
                    "email": email,
                    "full_name": full_name,
                    "role": role,
                    "role_selected": has_explicit_role,
                },
            )
        except IntegrityError:
            # Email already exists under a different UUID (e.g. user signed up
            # via email then linked Google OAuth, which has a new Supabase UID).
            # Migrate the existing profile to the new UUID.
            try:
                old_user = UserProfile.objects.get(email=email)
                old_id = old_user.id
                UserProfile.objects.filter(id=old_id).update(id=supabase_uid)
                logger.info(
                    "Migrated UserProfile UUID for %s: %s -> %s",
                    email, old_id, supabase_uid,
                )
                return UserProfile.objects.get(id=supabase_uid)
            except UserProfile.DoesNotExist:
                raise AuthenticationFailed("Could not resolve user account.")

        if created:
            logger.info("Auto-created UserProfile for %s (%s)", email, supabase_uid)
        elif user.email != email and email:
            user.email = email
            user.save(update_fields=["email"])

        return user
