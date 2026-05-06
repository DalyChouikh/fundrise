import base64
import json
import logging
import uuid

import requests
from django.conf import settings
from django.utils.timezone import now
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from webauthn import (
    generate_authentication_options,
    generate_registration_options,
    options_to_json,
    verify_authentication_response,
    verify_registration_response,
)
from webauthn.helpers.structs import (
    AuthenticatorSelectionCriteria,
    AuthenticatorTransport,
    PublicKeyCredentialDescriptor,
    ResidentKeyRequirement,
    UserVerificationRequirement,
)

from apps.users.models import PasskeyCredential
from apps.users.passkey_challenges import pop_challenge, store_challenge
from apps.users.step_up import issue as issue_step_up_token

logger = logging.getLogger(__name__)


class PasskeyRegisterBeginView(APIView):
    """POST /users/passkeys/register/begin/  — authenticated"""

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        user = request.user

        options = generate_registration_options(
            rp_id=settings.WEBAUTHN_RP_ID,
            rp_name=settings.WEBAUTHN_RP_NAME,
            user_id=user.id.bytes,
            user_name=user.email,
            user_display_name=user.full_name or user.email,
            exclude_credentials=[
                PublicKeyCredentialDescriptor(id=bytes(c.credential_id))
                for c in user.passkeys.all()
            ],
            authenticator_selection=AuthenticatorSelectionCriteria(
                resident_key=ResidentKeyRequirement.REQUIRED,
                user_verification=UserVerificationRequirement.PREFERRED,
            ),
        )

        store_challenge(f"passkey:reg:{user.id}", options.challenge)

        return Response(json.loads(options_to_json(options)))


class PasskeyRegisterCompleteView(APIView):
    """POST /users/passkeys/register/complete/  — authenticated"""

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        user = request.user

        challenge = pop_challenge(f"passkey:reg:{user.id}")
        if challenge is None:
            return Response(
                {"detail": "Registration session expired"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        credential_data = request.data.get("credential")
        if not credential_data:
            return Response(
                {"detail": "Missing credential"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            verification = verify_registration_response(
                credential=credential_data,
                expected_rp_id=settings.WEBAUTHN_RP_ID,
                expected_origin=settings.WEBAUTHN_EXPECTED_ORIGIN,
                expected_challenge=challenge,
                require_user_verification=False,
            )
        except Exception as e:
            logger.warning("Passkey registration verification failed: %s", e)
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)

        transports = (
            credential_data.get("response", {}).get("transports", [])
        )
        name = request.data.get("name", "")[:100]

        passkey = PasskeyCredential.objects.create(
            user=user,
            credential_id=verification.credential_id,
            public_key=verification.credential_public_key,
            sign_count=verification.sign_count,
            aaguid=str(verification.aaguid),
            transports=transports,
            name=name,
        )

        return Response(
            {
                "id": passkey.pk,
                "name": passkey.name,
                "created_at": passkey.created_at,
                "last_used_at": passkey.last_used_at,
            },
            status=status.HTTP_201_CREATED,
        )


class PasskeyListView(APIView):
    """GET /users/passkeys/  — authenticated"""

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        passkeys = request.user.passkeys.order_by("-created_at")
        data = [
            {
                "id": p.pk,
                "name": p.name,
                "created_at": p.created_at,
                "last_used_at": p.last_used_at,
            }
            for p in passkeys
        ]
        return Response(data)


class PasskeyDeleteView(APIView):
    """DELETE /users/passkeys/<int:pk>/  — authenticated"""

    permission_classes = [permissions.IsAuthenticated]

    def delete(self, request, pk):
        try:
            passkey = request.user.passkeys.get(pk=pk)
        except PasskeyCredential.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)

        passkey.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class PasskeyLoginBeginView(APIView):
    """POST /users/passkeys/login/begin/  — no auth required"""

    permission_classes = []

    def post(self, request):  # noqa: ARG002 — request required by DRF protocol
        options = generate_authentication_options(
            rp_id=settings.WEBAUTHN_RP_ID,
            allow_credentials=[],
            user_verification=UserVerificationRequirement.PREFERRED,
        )

        session_id = str(uuid.uuid4())
        store_challenge(f"passkey:auth:{session_id}", options.challenge)

        return Response(
            {
                "session_id": session_id,
                "options": json.loads(options_to_json(options)),
            }
        )


class PasskeyLoginCompleteView(APIView):
    """POST /users/passkeys/login/complete/  — no auth required"""

    permission_classes = []

    def post(self, request):
        session_id = request.data.get("session_id")
        if not session_id:
            return Response(
                {"detail": "Missing session_id"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        challenge = pop_challenge(f"passkey:auth:{session_id}")
        if challenge is None:
            return Response(
                {"detail": "Login session expired"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        credential_data = request.data.get("credential")
        if not credential_data:
            return Response(
                {"detail": "Missing credential"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Decode the base64url credential id to find the matching passkey
        credential_id_str = credential_data.get("id", "")
        # Pad for safety before decoding
        credential_id_bytes = base64.urlsafe_b64decode(credential_id_str + "==")

        try:
            passkey = PasskeyCredential.objects.select_related("user").get(
                credential_id=credential_id_bytes
            )
        except PasskeyCredential.DoesNotExist:
            return Response(
                {"detail": "Passkey not found"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            verification = verify_authentication_response(
                credential=credential_data,
                expected_rp_id=settings.WEBAUTHN_RP_ID,
                expected_origin=settings.WEBAUTHN_EXPECTED_ORIGIN,
                expected_challenge=challenge,
                credential_public_key=bytes(passkey.public_key),
                credential_current_sign_count=passkey.sign_count,
                require_user_verification=False,
            )
        except Exception as e:
            logger.warning("Passkey login verification failed: %s", e)
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)

        passkey.sign_count = verification.new_sign_count
        passkey.last_used_at = now()
        passkey.save(update_fields=["sign_count", "last_used_at"])

        # Session bridge: get a magic-link OTP from Supabase so the frontend
        # can exchange it for a real Supabase session.
        try:
            resp = requests.post(
                f"{settings.SUPABASE_URL}/auth/v1/admin/generate_link",
                headers={
                    "apikey": settings.SUPABASE_SERVICE_ROLE_KEY,
                    "Authorization": f"Bearer {settings.SUPABASE_SERVICE_ROLE_KEY}",
                    "Content-Type": "application/json",
                },
                json={"type": "magiclink", "email": passkey.user.email},
                timeout=10,
            )
            resp.raise_for_status()
        except Exception:
            logger.exception("Supabase generate_link call failed for passkey login")
            return Response(
                {"detail": "Authentication service error"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        otp = resp.json()["email_otp"]

        return Response({"email": passkey.user.email, "token": otp})


class PasskeyStepUpBeginView(APIView):
    """POST /users/passkeys/step-up/begin/  — authenticated"""

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        user = request.user

        allow_credentials = [
            PublicKeyCredentialDescriptor(
                id=bytes(c.credential_id),
                transports=[AuthenticatorTransport(t) for t in c.transports] if c.transports else None,
            )
            for c in user.passkeys.all()
        ]

        options = generate_authentication_options(
            rp_id=settings.WEBAUTHN_RP_ID,
            allow_credentials=allow_credentials,
            user_verification=UserVerificationRequirement.PREFERRED,
        )

        store_challenge(f"passkey:stepup:{user.id}", options.challenge)

        return Response(json.loads(options_to_json(options)))


class PasskeyStepUpCompleteView(APIView):
    """POST /users/passkeys/step-up/complete/  — authenticated"""

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        user = request.user

        challenge = pop_challenge(f"passkey:stepup:{user.id}")
        if challenge is None:
            return Response(
                {"detail": "Step-up session expired"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        credential_data = request.data.get("credential")
        if not credential_data:
            return Response(
                {"detail": "Missing credential"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Decode the base64url credential id to find the matching passkey
        credential_id_str = credential_data.get("id", "")
        credential_id_bytes = base64.urlsafe_b64decode(credential_id_str + "==")

        try:
            passkey = PasskeyCredential.objects.select_related("user").get(
                credential_id=credential_id_bytes
            )
        except PasskeyCredential.DoesNotExist:
            return Response(
                {"detail": "Passkey not found"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Ensure the passkey belongs to the authenticated user
        if passkey.user_id != user.id:
            return Response(
                {"detail": "Passkey does not belong to this user"},
                status=status.HTTP_403_FORBIDDEN,
            )

        try:
            verification = verify_authentication_response(
                credential=credential_data,
                expected_rp_id=settings.WEBAUTHN_RP_ID,
                expected_origin=settings.WEBAUTHN_EXPECTED_ORIGIN,
                expected_challenge=challenge,
                credential_public_key=bytes(passkey.public_key),
                credential_current_sign_count=passkey.sign_count,
                require_user_verification=False,
            )
        except Exception as e:
            logger.warning("Passkey step-up verification failed: %s", e)
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)

        passkey.sign_count = verification.new_sign_count
        passkey.last_used_at = now()
        passkey.save(update_fields=["sign_count", "last_used_at"])

        token = issue_step_up_token(str(user.id))

        return Response({"action_token": token})
