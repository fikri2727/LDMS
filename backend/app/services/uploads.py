"""Supabase Storage (bucket "uploads") — ported from ldms-web/src/lib/uploads.ts.

Same bucket, same "<subdir>/<timestamp>-<random>-<name>" paths, so files uploaded by
the old app are still readable here.
"""

import mimetypes
import os
import re
import secrets
import time
from urllib.parse import quote

import httpx
from fastapi import HTTPException, UploadFile
from fastapi.responses import Response

from app.config import get_settings

BUCKET = "uploads"

EXTENSION_MIME_TYPES = {
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".gif": "image/gif",
    ".webp": "image/webp",
    ".svg": "image/svg+xml",
    ".pdf": "application/pdf",
    ".ppt": "application/vnd.ms-powerpoint",
    ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    ".mp4": "video/mp4",
    ".webm": "video/webm",
    ".mov": "video/quicktime",
    ".ogg": "video/ogg",
}


def guess_mime_type(file_name: str) -> str:
    ext = os.path.splitext(file_name)[1].lower()
    return EXTENSION_MIME_TYPES.get(ext) or mimetypes.guess_type(file_name)[0] or "application/octet-stream"


def _storage_url(path: str = "") -> str:
    base = get_settings().supabase_url.rstrip("/")
    return f"{base}/storage/v1/object/{BUCKET}" + (f"/{quote(path)}" if path else "")


def _headers() -> dict[str, str]:
    key = get_settings().supabase_service_role_key
    return {"Authorization": f"Bearer {key}", "apikey": key}


async def save_upload(subdir: str, file: UploadFile) -> str:
    """Saves an uploaded file under <subdir>/ with a random-prefixed name; returns the relative path."""
    safe_name = re.sub(r"[^a-zA-Z0-9._-]", "_", file.filename or "file")
    path = f"{subdir}/{int(time.time() * 1000)}-{secrets.token_hex(4)}-{safe_name}"
    data = await file.read()
    content_type = file.content_type or guess_mime_type(file.filename or "")
    async with httpx.AsyncClient(timeout=300) as client:
        r = await client.post(_storage_url(path), content=data, headers={**_headers(), "content-type": content_type})
    if r.status_code >= 400:
        raise HTTPException(500, f"Failed to upload file: {r.text}")
    return path


def delete_upload(path: str) -> None:
    with httpx.Client(timeout=60) as client:
        client.request("DELETE", _storage_url(), json={"prefixes": [path]}, headers=_headers())


def read_upload(path: str) -> bytes:
    with httpx.Client(timeout=300) as client:
        r = client.get(_storage_url(path), headers=_headers())
    if r.status_code >= 400:
        raise HTTPException(404, "File not found.")
    return r.content


def file_response(path: str, file_name: str, content_type: str, disposition: str = "attachment") -> Response:
    ascii_name = file_name.encode("ascii", "replace").decode().replace('"', "")
    return Response(
        read_upload(path),
        media_type=content_type,
        headers={"Content-Disposition": f"{disposition}; filename=\"{ascii_name}\"; filename*=UTF-8''{quote(file_name)}"},
    )
