"""Parse uploaded files into plain text."""

import base64
import csv
import io
from pathlib import Path

from openai import OpenAI
from pypdf import PdfReader

# GPT-4o Vision supported formats only (TIFF not supported by the API)
_IMAGE_EXTS = {".png", ".jpg", ".jpeg", ".webp"}

_IMAGE_MIME = {
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".webp": "image/webp",
}

_VISION_PROMPT = (
    "Extract all text from this financial document exactly as it appears. "
    "Preserve layout and numbers precisely. Return only the raw text, no commentary."
)


def parse(filename: str, content: bytes, openai: OpenAI | None = None) -> str:
    ext = Path(filename).suffix.lower()
    if ext == ".pdf":
        text = _parse_pdf(content)
    elif ext == ".csv":
        text = _parse_csv(content)
    elif ext in _IMAGE_EXTS:
        if openai is None:
            raise ValueError("An OpenAI client is required to parse image files.")
        text = _parse_image(content, ext, openai)
    else:
        raise ValueError(f"Unsupported file type: {ext}")
    # PostgreSQL rejects null bytes in text columns; strip them from all sources
    return text.replace("\x00", "")


def _parse_pdf(content: bytes) -> str:
    reader = PdfReader(io.BytesIO(content))
    pages = [page.extract_text() or "" for page in reader.pages]
    return "\n".join(pages).strip()


def _parse_csv(content: bytes) -> str:
    text = content.decode("utf-8", errors="replace")
    reader = csv.reader(io.StringIO(text))
    rows = [", ".join(row) for row in reader]
    return "\n".join(rows).strip()


def _parse_image(content: bytes, ext: str, openai: OpenAI) -> str:
    mime = _IMAGE_MIME[ext]
    b64 = base64.standard_b64encode(content).decode()
    response = openai.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{
            "role": "user",
            "content": [
                {"type": "image_url", "image_url": {"url": f"data:{mime};base64,{b64}"}},
                {"type": "text", "text": _VISION_PROMPT},
            ],
        }],
    )
    return (response.choices[0].message.content or "").strip()
