import logging
from functools import wraps
from typing import Any, Callable

from django.core.signing import BadSignature, TimestampSigner
from django.http import JsonResponse

logger = logging.getLogger(__name__)

_signer = TimestampSigner(salt="passkey_step_up")

STEP_UP_MAX_AGE = 300  # 5 minutes


def issue(user_id: str) -> str:
    """Return a signed step-up token for the given user."""
    return _signer.sign(f"{user_id}:passkey")


def verify(token: str, user_id: str) -> bool:
    """Return True if token is valid for user_id and not expired."""
    try:
        value = _signer.unsign(token, max_age=STEP_UP_MAX_AGE)
        return value == f"{user_id}:passkey"
    except BadSignature:
        return False
    except Exception:
        logger.exception("Unexpected error verifying step-up token")
        return False


def require_step_up_if_passkey(view_func: Callable) -> Callable:
    """
    Decorator for DRF view methods. If the authenticated user has any
    registered passkeys, enforce a valid X-Step-Up-Token header.
    Users without passkeys pass through unchallenged.
    """
    @wraps(view_func)
    def wrapper(self_or_request: Any, *args: Any, **kwargs: Any) -> Any:
        # Handles both APIView methods (self, request) and plain function views (request)
        if hasattr(self_or_request, "request"):
            request = self_or_request.request
            instance = self_or_request
        else:
            request = self_or_request
            instance = None

        user = request.user
        token = request.headers.get("X-Step-Up-Token", "")

        if token:
            if verify(token, str(user.id)):
                if instance is not None:
                    return view_func(instance, *args, **kwargs)
                return view_func(request, *args, **kwargs)
            return JsonResponse(
                {"detail": "Step-up token is invalid or expired.", "code": "step_up_expired"},
                status=403,
            )

        if not user.passkeys.exists():
            if instance is not None:
                return view_func(instance, *args, **kwargs)
            return view_func(request, *args, **kwargs)

        return JsonResponse(
            {"detail": "Step-up authentication required.", "code": "step_up_required"},
            status=403,
        )

    return wrapper
