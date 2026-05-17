import csv
import io
import unittest.mock as mock

import pytest

from app.pipeline.parser import parse


def _make_csv(rows: list[list[str]]) -> bytes:
    buf = io.StringIO()
    writer = csv.writer(buf)
    writer.writerows(rows)
    return buf.getvalue().encode()


def test_csv_basic():
    rows = [["Date", "Amount", "Description"], ["2024-03-01", "-54.32", "Whole Foods"]]
    content = _make_csv(rows)
    result = parse("statement.csv", content)
    assert "Date" in result
    assert "Whole Foods" in result


def test_csv_multirow():
    rows = [["col1", "col2"]] + [[f"val{i}", f"val{i+1}"] for i in range(10)]
    content = _make_csv(rows)
    result = parse("data.csv", content)
    assert result.count("\n") == 10  # 11 rows → 10 newlines


def test_unsupported_extension_raises():
    with pytest.raises(ValueError, match="Unsupported file type"):
        parse("document.docx", b"some content")


def test_image_calls_openai_vision():
    import unittest.mock as mock
    fake_response = mock.MagicMock()
    fake_response.choices[0].message.content = "Total: $1,234.56"

    fake_client = mock.MagicMock()
    fake_client.chat.completions.create.return_value = fake_response

    result = parse("scan.png", b"fake image bytes", openai=fake_client)

    assert result == "Total: $1,234.56"
    fake_client.chat.completions.create.assert_called_once()
    call_kwargs = fake_client.chat.completions.create.call_args.kwargs
    assert call_kwargs["model"] == "gpt-4o-mini"


def test_tiff_unsupported():
    with pytest.raises(ValueError, match="Unsupported file type"):
        parse("scan.tiff", b"fake image bytes")


def test_filename_case_insensitive():
    content = _make_csv([["a", "b"]])
    result = parse("STATEMENT.CSV", content)
    assert "a" in result


def test_null_bytes_stripped_from_csv():
    content = _make_csv([["col\x00A", "col\x00B"], ["val\x001", "val\x002"]])
    result = parse("data.csv", content)
    assert "\x00" not in result


def _make_pdf() -> bytes:
    from pypdf import PdfWriter
    writer = PdfWriter()
    writer.add_blank_page(width=612, height=792)
    buf = io.BytesIO()
    writer.write(buf)
    return buf.getvalue()


def test_pdf_returns_string():
    result = parse("statement.pdf", _make_pdf())
    assert isinstance(result, str)


def test_pdf_extracts_text():
    mock_page = mock.MagicMock()
    mock_page.extract_text.return_value = "Total expenses: $54.32"
    with mock.patch("app.pipeline.parser.PdfReader") as mock_reader:
        mock_reader.return_value.pages = [mock_page]
        result = parse("statement.pdf", b"fake pdf bytes")
    assert "Total expenses" in result
    assert "$54.32" in result
