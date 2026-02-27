"""
quality.py — Sharpness measurement and quality gate.

Uses Laplacian variance via PIL's edge filter — no OpenCV required.
A lower variance means a blurrier (lower-quality) render.
"""

import numpy as np
from PIL import Image, ImageFilter
import fitz  # PyMuPDF


def render_page_thumbnail(pdf_bytes: bytes, page_index: int = 0,
                           scale: float = 0.5) -> Image.Image:
    """Render a page from PDF bytes as a greyscale PIL image for sharpness analysis."""
    doc = fitz.open("pdf", pdf_bytes)
    page = doc[min(page_index, len(doc) - 1)]
    mat = fitz.Matrix(scale, scale)
    pix = page.get_pixmap(matrix=mat, colorspace=fitz.csGRAY)
    return Image.frombytes("L", [pix.width, pix.height], pix.samples)


def measure_sharpness(img: Image.Image) -> float:
    """
    Laplacian variance sharpness metric.
    Higher = sharper. Returns 0.0 for an empty image.
    """
    edges = img.filter(ImageFilter.FIND_EDGES)
    arr = np.array(edges, dtype=np.float64)
    return float(np.var(arr))


def measure_pdf_sharpness(pdf_bytes: bytes, page_index: int = 0) -> float:
    """Render page 0 of a PDF and return its sharpness score."""
    return measure_sharpness(render_page_thumbnail(pdf_bytes, page_index))


def gate(baseline: float, current: float, max_drop: float) -> bool:
    """
    Returns True if the quality loss is within the acceptable threshold.

    Args:
        baseline:  sharpness of the original document
        current:   sharpness of the compressed candidate
        max_drop:  maximum fractional drop allowed (e.g. 0.25 = 25%)
    """
    if baseline < 1.0:
        return True  # can't measure baseline — allow everything
    drop = (baseline - current) / baseline
    return drop < max_drop
