import csv
import io

import pytest

from app.pipeline.parser import parse


def _make_csv(rows: list[list[str]]) -> bytes:
    buf = io.StringIO()
    writer = csv.writer(buf)
    writer.writerows(rows)
    return buf.getvalue().encode()


def test_csv_basic():
    content = _make_csv([["Date", "Amount", "Description"], ["2024-03-01", "-54.32", "Whole Foods"]])
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


def test_image_without_tesseract_raises_value_error():
    # On CI, Tesseract is not installed — parser should raise ValueError with clear message
    import unittest.mock as mock
    with mock.patch.dict("sys.modules", {"pytesseract": None, "PIL": None}):
        with pytest.raises((ValueError, Exception)):
            parse("scan.png", b"fake image bytes")


def test_filename_case_insensitive():
    content = _make_csv([["a", "b"]])
    result = parse("STATEMENT.CSV", content)
    assert "a" in result
