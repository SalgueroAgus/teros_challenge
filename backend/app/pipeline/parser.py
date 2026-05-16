"""Parse uploaded files into plain text."""

import csv
import io
from pathlib import Path

from pypdf import PdfReader

_IMAGE_EXTS = {".png", ".jpg", ".jpeg", ".webp", ".tiff"}


def parse(filename: str, content: bytes) -> str:
    ext = Path(filename).suffix.lower()
    if ext == ".pdf":
        return _parse_pdf(content)
    if ext == ".csv":
        return _parse_csv(content)
    if ext in _IMAGE_EXTS:
        return _parse_image(content)
    raise ValueError(f"Unsupported file type: {ext}")


def _parse_pdf(content: bytes) -> str:
    reader = PdfReader(io.BytesIO(content))
    pages = [page.extract_text() or "" for page in reader.pages]
    return "\n".join(pages).strip()


def _parse_csv(content: bytes) -> str:
    text = content.decode("utf-8", errors="replace")
    reader = csv.reader(io.StringIO(text))
    rows = [", ".join(row) for row in reader]
    return "\n".join(rows).strip()


def _parse_image(content: bytes) -> str:
    try:
        import pytesseract
        from PIL import Image
        image = Image.open(io.BytesIO(content))
        return pytesseract.image_to_string(image).strip()
    except Exception:
        raise ValueError(
            "Image parsing requires Tesseract OCR, which is not available in this environment. "
            "Upload a PDF or CSV instead."
        )
