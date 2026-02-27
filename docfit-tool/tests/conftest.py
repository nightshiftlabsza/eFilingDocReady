"""
conftest.py — Shared pytest fixtures for docfit tests.
"""

import io
import random

import fitz  # PyMuPDF
import numpy as np
import pytest
from PIL import Image


@pytest.fixture
def tiny_pdf_bytes() -> bytes:
    """Minimal 1-page PDF (A4) with an embedded colour JPEG image.

    The image is saved at quality=95 so that recompressing to a lower quality
    (e.g. q=50 in test_recompress_reduces_size) is guaranteed to produce a
    smaller stream — regardless of the image content.
    """
    # Use a smooth gradient rather than pure random noise: gradients are
    # representative of real scans and compress reliably at lower JPEG quality.
    arr = np.zeros((200, 200, 3), dtype=np.uint8)
    for ch in range(3):
        arr[:, :, ch] = np.linspace(20 + ch * 30, 200 + ch * 10, 200,
                                     dtype=np.uint8)
    pil = Image.fromarray(arr, 'RGB')
    img_buf = io.BytesIO()
    pil.save(img_buf, 'JPEG', quality=95)  # high quality → lots of headroom for q=50
    img_buf.seek(0)

    doc = fitz.open()
    page = doc.new_page(width=595, height=842)  # A4 at 72 DPI
    rect = fitz.Rect(50, 50, 250, 250)
    page.insert_image(rect, stream=img_buf.getvalue())
    result = doc.tobytes(garbage=2, deflate=True)
    doc.close()
    return result


@pytest.fixture
def sample_photo_img() -> Image.Image:
    """Randomly coloured 200x200 RGB image — should be classified as 'photo'."""
    arr = np.random.randint(0, 255, (200, 200, 3), dtype=np.uint8)
    return Image.fromarray(arr, 'RGB')


@pytest.fixture
def sample_lineart_img() -> Image.Image:
    """High-contrast B&W striped 200x200 image — should be classified as 'lineart'."""
    arr = np.zeros((200, 200), dtype=np.uint8)
    arr[::4, :] = 255  # horizontal white stripes on black background
    return Image.fromarray(arr, 'L').convert('RGB')
