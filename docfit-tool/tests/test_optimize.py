"""
test_optimize.py — Tests for the main optimization pipeline.
"""

import io
import os
import tempfile

import fitz
import numpy as np
import pytest
from PIL import Image

from docfit.optimize import run_optimize
from docfit.pdf_ops import lossless_cleanup, merge_inputs


# ── Helpers ───────────────────────────────────────────────────────────────────

def _write_tmp_pdf(pdf_bytes: bytes) -> str:
    tmp = tempfile.NamedTemporaryFile(suffix='.pdf', delete=False)
    tmp.write(pdf_bytes)
    tmp.close()
    return tmp.name


def _write_tmp_jpg(size=(200, 200)) -> str:
    arr = np.random.randint(50, 200, (*size, 3), dtype=np.uint8)
    pil = Image.fromarray(arr, 'RGB')
    tmp = tempfile.NamedTemporaryFile(suffix='.jpg', delete=False)
    pil.save(tmp, 'JPEG', quality=85)
    tmp.close()
    return tmp.name


# ── Tests ─────────────────────────────────────────────────────────────────────

def test_lossless_cleanup_reduces_size(tiny_pdf_bytes):
    """Lossless cleanup should produce output smaller than or equal to the input."""
    cleaned = lossless_cleanup(tiny_pdf_bytes)
    assert len(cleaned) <= len(tiny_pdf_bytes), (
        "lossless_cleanup should not inflate the file"
    )
    assert len(cleaned) > 0


def test_always_produces_output(tiny_pdf_bytes):
    """Even with an impossibly small target (1 byte), a file must always be written."""
    in_path = _write_tmp_pdf(tiny_pdf_bytes)
    out_path = in_path.replace('.pdf', '_out.pdf')
    try:
        result = run_optimize([in_path], out_path, max_bytes=1, profile_name='aggressive')
        assert os.path.isfile(out_path), "Output file must always be created"
        assert os.path.getsize(out_path) > 0, "Output file must not be empty"
    finally:
        for p in (in_path, out_path):
            try:
                os.unlink(p)
            except OSError:
                pass


def test_size_target_met_for_small_doc(tiny_pdf_bytes):
    """A tiny document should easily fit within the 5 MB SARS limit."""
    in_path = _write_tmp_pdf(tiny_pdf_bytes)
    out_path = in_path.replace('.pdf', '_out.pdf')
    try:
        result = run_optimize([in_path], out_path, max_bytes=5_000_000,
                               profile_name='exceptional')
        assert result['status'].startswith('success'), (
            f"Expected success but got: {result['status']}"
        )
        assert result['output_mb'] <= 5.0
    finally:
        for p in (in_path, out_path):
            try:
                os.unlink(p)
            except OSError:
                pass


def test_merge_pdf_and_image(tiny_pdf_bytes):
    """Merging a PDF and a JPG should produce a valid 2-page PDF."""
    pdf_path = _write_tmp_pdf(tiny_pdf_bytes)
    jpg_path = _write_tmp_jpg()
    out_path = pdf_path.replace('.pdf', '_merged.pdf')
    try:
        result = run_optimize([pdf_path, jpg_path], out_path,
                               max_bytes=5_000_000, profile_name='exceptional')
        assert os.path.isfile(out_path)
        doc = fitz.open(out_path)
        assert len(doc) == 2, f"Expected 2 pages after merge, got {len(doc)}"
        doc.close()
    finally:
        for p in (pdf_path, jpg_path, out_path):
            try:
                os.unlink(p)
            except OSError:
                pass


def test_profile_exceptional_sharpness(tiny_pdf_bytes):
    """
    The 'exceptional' profile should not degrade sharpness by more than 25%.
    This test uses the lossless cleanup path (tiny document) so sharpness drop
    should be zero.
    """
    from docfit.quality import measure_pdf_sharpness
    from docfit.pdf_ops import lossless_cleanup

    original_sharpness = measure_pdf_sharpness(tiny_pdf_bytes)
    cleaned = lossless_cleanup(tiny_pdf_bytes)
    cleaned_sharpness = measure_pdf_sharpness(cleaned)

    if original_sharpness > 1.0:
        drop = (original_sharpness - cleaned_sharpness) / original_sharpness
        assert drop < 0.25, (
            f"Exceptional profile sharpness drop {drop:.2%} exceeds 25% threshold"
        )
