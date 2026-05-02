import mimetypes
import requests
from django.conf import settings


def upload_to_supabase(file_bytes: bytes, filename: str, bucket: str, path: str) -> str:
    mime_type, _ = mimetypes.guess_type(filename)
    url = f"{settings.SUPABASE_URL}/storage/v1/object/{bucket}/{path}"
    resp = requests.post(
        url,
        headers={
            "Authorization": f"Bearer {settings.SUPABASE_SERVICE_ROLE_KEY}",
            "Content-Type": mime_type or "application/octet-stream",
        },
        data=file_bytes,
        timeout=30,
    )
    resp.raise_for_status()
    return f"{settings.SUPABASE_URL}/storage/v1/object/public/{bucket}/{path}"
