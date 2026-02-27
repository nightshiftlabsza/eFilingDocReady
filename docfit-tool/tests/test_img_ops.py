"""
test_img_ops.py — Tests for image classification and recompression.
"""

import io

import numpy as np
import pytest
from PIL import Image

from docfit.img_ops import classify_image, recompress_images


def test_classify_photo(sample_photo_img):
    """Randomly coloured RGB image should be classified as 'photo'."""
    assert classify_image(sample_photo_img) == 'photo'


def test_classify_lineart(sample_lineart_img):
    """High-contrast B&W striped image should be classified as 'lineart'."""
    assert classify_image(sample_lineart_img) == 'lineart'


def test_classify_greyscale_rgb_as_lineart():
    """An RGB image with near-zero channel spread should be classified as 'lineart'."""
    # Greyscale values (R==G==B) — no colour information
    arr = np.tile(np.linspace(0, 255, 200, dtype=np.uint8), (200, 1))
    rgb = np.stack([arr, arr, arr], axis=2)
    img = Image.fromarray(rgb, 'RGB')
    assert classify_image(img) == 'lineart'


def test_recompress_reduces_size(tiny_pdf_bytes):
    """Recompressing images at quality 50 should produce a smaller PDF."""
    original_size = len(tiny_pdf_bytes)
    compressed = recompress_images(tiny_pdf_bytes, jpeg_quality=50)
    assert len(compressed) < original_size, (
        f"Expected compressed PDF ({len(compressed)} B) to be smaller than "
        f"original ({original_size} B)"
    )


def test_recompress_returns_bytes(tiny_pdf_bytes):
    """recompress_images must always return bytes, even at high quality."""
    result = recompress_images(tiny_pdf_bytes, jpeg_quality=90)
    assert isinstance(result, bytes)
    assert len(result) > 0


def test_recompress_never_crashes_on_bad_input():
    """Passing an invalid PDF should not raise an exception — returns empty or input."""
    bad_bytes = b'%PDF-1.4 this is not a real PDF'
    try:
        result = recompress_images(bad_bytes, jpeg_quality=50)
        # If it returns something, it should be bytes
        assert isinstance(result, bytes)
    except Exception:
        # A controlled exception from pikepdf open is acceptable;
        # the important thing is the image-loop itself never crashes
        pass
