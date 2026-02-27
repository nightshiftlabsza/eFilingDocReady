"""
test_quality.py — Tests for sharpness measurement and quality gate.
"""

import numpy as np
import pytest
from PIL import Image, ImageFilter

from docfit.quality import gate, measure_sharpness


def _make_sharp_image() -> Image.Image:
    arr = np.zeros((100, 100), dtype=np.uint8)
    arr[::2, :] = 255  # alternating black/white rows — maximally sharp
    return Image.fromarray(arr, 'L')


def _make_blurry_image() -> Image.Image:
    img = _make_sharp_image()
    return img.filter(ImageFilter.GaussianBlur(radius=5))


def test_sharpness_sharp_gt_blurry():
    """A sharp image must have a higher sharpness score than a blurred version."""
    sharp_score = measure_sharpness(_make_sharp_image())
    blurry_score = measure_sharpness(_make_blurry_image())
    assert sharp_score > blurry_score, (
        f"Sharp score ({sharp_score:.2f}) should exceed blurry score ({blurry_score:.2f})"
    )


def test_gate_passes_within_threshold():
    """A 20% quality drop should pass a 40% max_drop gate."""
    assert gate(baseline=100.0, current=80.0, max_drop=0.40) is True


def test_gate_fails_excess_drop():
    """A 60% quality drop should fail a 40% max_drop gate."""
    assert gate(baseline=100.0, current=40.0, max_drop=0.40) is False


def test_gate_passes_zero_baseline():
    """When baseline is zero (unmeasurable), the gate should always pass."""
    assert gate(baseline=0.0, current=0.0, max_drop=0.25) is True


def test_gate_passes_tiny_baseline():
    """When baseline < 1.0, the gate should always pass."""
    assert gate(baseline=0.5, current=0.0, max_drop=0.10) is True


def test_gate_at_exact_threshold():
    """A drop exactly equal to max_drop should fail (strict less-than comparison)."""
    assert gate(baseline=100.0, current=60.0, max_drop=0.40) is False
