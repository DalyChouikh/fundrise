import base64
import io
import json
import mimetypes

import pdfplumber
import requests
from django.conf import settings
from openai import AsyncOpenAI


INVESTOR_FIELDS = ["full_name", "date_of_birth", "id_number", "nationality"]
STARTUP_FIELDS = ["company_name", "registration_id", "formation_date", "legal_form"]

ARABIC_NOTE = (
    "The document may be in Arabic or French. "
    "Transliterate all Arabic names and values into Latin script "
    "(e.g., بن صالح → Ben Saleh, محمد → Mohamed). "
    "Return all fields in Latin script regardless of source language. "
    "For dates, use ISO format YYYY-MM-DD."
)


def _build_extract_prompt(doc_type: str, text: str | None) -> str:
    fields = INVESTOR_FIELDS if doc_type == "investor" else STARTUP_FIELDS
    field_list = ", ".join(f"`{f}`" for f in fields)
    base = (
        f"Extract the following fields from this identity document: {field_list}.\n"
        f"{ARABIC_NOTE}\n"
        "Return a JSON object with exactly these keys. "
        "If a field cannot be found, set it to null. "
        "Do not include any explanation, only the JSON object."
    )
    if text:
        return f"{base}\n\nDocument text:\n{text}"
    return base


async def _call_ai(prompt: str, image_b64: str | None, mime_type: str | None) -> dict:
    client = AsyncOpenAI(
        api_key=settings.AI_API_KEY,
        base_url=settings.AI_BASE_URL,
    )
    if image_b64:
        model = settings.AI_VISION_MODEL
        content = [
            {"type": "image_url", "image_url": {"url": f"data:{mime_type};base64,{image_b64}"}},
            {"type": "text", "text": prompt},
        ]
    else:
        model = settings.AI_MODEL
        content = prompt

    response = await client.chat.completions.create(
        model=model,
        messages=[{"role": "user", "content": content}],
        max_tokens=400,
    )
    raw = response.choices[0].message.content or "{}"
    raw = raw.strip().removeprefix("```json").removeprefix("```").removesuffix("```").strip()
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        return {}


def _upload_document(file_bytes: bytes, filename: str, user_id: str, doc_type: str) -> str:
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else "bin"
    folder = "identity" if doc_type == "investor" else "company"
    path = f"{user_id}/{folder}.{ext}"
    mime_type, _ = mimetypes.guess_type(filename)
    url = f"{settings.SUPABASE_URL}/storage/v1/object/user-documents/{path}"
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
    return f"{settings.SUPABASE_URL}/storage/v1/object/public/user-documents/{path}"


def _confidence(extracted: dict, doc_type: str) -> str:
    fields = INVESTOR_FIELDS if doc_type == "investor" else STARTUP_FIELDS
    found = sum(1 for f in fields if extracted.get(f))
    ratio = found / len(fields)
    if ratio >= 0.75:
        return "high"
    if ratio >= 0.4:
        return "partial"
    return "low"


async def extract_document(file_bytes: bytes, filename: str, doc_type: str, user_id: str) -> dict:
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""

    image_b64 = None
    mime_type = None
    text = None

    if ext == "pdf":
        with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
            pages_text = []
            for page in pdf.pages:
                page_text = page.extract_text()
                if page_text:
                    pages_text.append(page_text)
            text = "\n\n".join(pages_text)
    else:
        mime_type, _ = mimetypes.guess_type(filename)
        mime_type = mime_type or "image/jpeg"
        image_b64 = base64.b64encode(file_bytes).decode("utf-8")

    prompt = _build_extract_prompt(doc_type, text)
    extracted = await _call_ai(prompt, image_b64, mime_type)

    from asgiref.sync import sync_to_async
    document_url = await sync_to_async(_upload_document)(file_bytes, filename, user_id, doc_type)

    return {
        "extracted": extracted,
        "confidence": _confidence(extracted, doc_type),
        "document_url": document_url,
    }
