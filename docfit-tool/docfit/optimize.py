"""
optimize.py — Main orchestrator for the quality-first compression pipeline.

Pipeline (each phase only runs if the previous didn't meet the size target):
  1. Lossless structural cleanup   (PyMuPDF — zero quality loss)
  2. Selective image recompression (pikepdf — preserves vector text)
  3. Ghostscript re-distillation   (optional — only if GS is installed)
  4. Page rasterization            (last resort — rasterises everything)
  5. Always output best result     (never return nothing)
"""

from . import pdf_ops, img_ops, quality

# ── Profile configuration ─────────────────────────────────────────────────────
PROFILES = {
    'exceptional': dict(
        max_sharpness_drop=0.25,
        image_quality_ladder=[85, 75, 65, 55],
        lineart_quality_offset=15,   # lineart gets quality+15 to protect fine detail
        raster_ladder=[(300, 90), (250, 80), (200, 72)],
        min_raster_dpi=200,
    ),
    'balanced': dict(
        max_sharpness_drop=0.40,
        image_quality_ladder=[75, 60, 45, 35],
        lineart_quality_offset=10,
        raster_ladder=[(200, 80), (150, 65), (120, 55)],
        min_raster_dpi=150,
    ),
    'aggressive': dict(
        max_sharpness_drop=0.60,
        image_quality_ladder=[60, 45, 30, 20],
        lineart_quality_offset=5,
        raster_ladder=[(150, 70), (120, 55), (100, 45)],
        min_raster_dpi=100,
    ),
}


def run_optimize(inputs: list, output_path: str, max_bytes: int,
                 profile_name: str = 'exceptional', verbose: bool = False) -> dict:
    """
    Compress and/or merge the input files to meet the max_bytes target.

    Args:
        inputs:       list of file paths (PDF, JPG, PNG, etc.)
        output_path:  where to write the output PDF
        max_bytes:    target size in bytes (e.g. 5_000_000 for 5 MB)
        profile_name: 'exceptional', 'balanced', or 'aggressive'
        verbose:      print progress messages if True

    Returns:
        dict with keys: status, input_mb, output_mb, output_path, phase
    """
    cfg = PROFILES[profile_name]

    def log(msg):
        if verbose:
            print(msg)

    # ── Step 1: Merge all inputs into a single PDF ────────────────────────────
    log(f"Merging {len(inputs)} input(s)...")
    merged_bytes = pdf_ops.merge_inputs(inputs)
    input_mb = len(merged_bytes) / 1_000_000
    log(f"  Merged size: {input_mb:.2f} MB")

    # ── Baseline sharpness reference (page 0 thumbnail) ──────────────────────
    try:
        baseline_sharpness = quality.measure_pdf_sharpness(merged_bytes)
    except Exception:
        baseline_sharpness = 0.0  # can't measure — disable quality gate

    # ── Phase 1: Lossless cleanup ─────────────────────────────────────────────
    log("Phase 1: lossless cleanup...")
    result = pdf_ops.lossless_cleanup(merged_bytes)
    log(f"  After cleanup: {len(result)/1_000_000:.2f} MB")

    if len(result) <= max_bytes:
        _write(result, output_path)
        return _report('lossless cleanup', result, input_mb, output_path)

    # ── Phase 2: Selective image recompression ────────────────────────────────
    log("Phase 2: image recompression...")
    working = result
    for jpeg_q in cfg['image_quality_ladder']:
        log(f"  Trying JPEG quality {jpeg_q}...")
        candidate = img_ops.recompress_images(
            working, jpeg_q, cfg['lineart_quality_offset']
        )
        try:
            sharp = quality.measure_pdf_sharpness(candidate)
            if not quality.gate(baseline_sharpness, sharp, cfg['max_sharpness_drop']):
                log(f"  Quality gate failed at q={jpeg_q} — stopping image recompression")
                break
        except Exception:
            pass  # quality check failed — continue anyway

        working = candidate
        log(f"  Size: {len(working)/1_000_000:.2f} MB")
        if len(working) <= max_bytes:
            _write(working, output_path)
            return _report('image recompression', working, input_mb, output_path)

    # ── Phase 3: Ghostscript (optional) ──────────────────────────────────────
    if pdf_ops.ghostscript_available():
        log("Phase 3: Ghostscript compression...")
        for gs_setting in ['/printer', '/ebook']:
            log(f"  Trying GS {gs_setting}...")
            candidate = pdf_ops.ghostscript_compress(merged_bytes, gs_setting)
            log(f"  Size: {len(candidate)/1_000_000:.2f} MB")
            if len(candidate) <= max_bytes:
                _write(candidate, output_path)
                return _report(f'Ghostscript {gs_setting}', candidate, input_mb, output_path)
    else:
        log("Phase 3: Ghostscript not installed — skipping")

    # ── Phase 4: Page rasterization (last resort) ─────────────────────────────
    log("Phase 4: page rasterization (last resort)...")
    best = working
    for dpi, jpeg_q in cfg['raster_ladder']:
        log(f"  Rasterising at {dpi} DPI, JPEG quality {jpeg_q}...")
        candidate = pdf_ops.rasterize(merged_bytes, dpi, jpeg_q)
        log(f"  Size: {len(candidate)/1_000_000:.2f} MB")
        try:
            sharp = quality.measure_pdf_sharpness(candidate)
            quality_ok = quality.gate(baseline_sharpness, sharp, cfg['max_sharpness_drop'])
        except Exception:
            quality_ok = True  # allow if measurement fails

        if quality_ok:
            if len(candidate) < len(best):
                best = candidate
            if len(best) <= max_bytes:
                _write(best, output_path)
                return _report(f'rasterization ({dpi} DPI)', best, input_mb, output_path)

    # ── Always output best result — never return nothing ──────────────────────
    _write(best, output_path)
    mb_achieved = len(best) / 1_000_000
    mb_target = max_bytes / 1_000_000
    status = (
        f"WARNING: best result {mb_achieved:.2f} MB — "
        f"target {mb_target:.1f} MB not met. "
        f"Suggestions: split into multiple files; scan in greyscale; reduce page count."
    )
    log(status)
    return {
        'status': status,
        'input_mb': round(input_mb, 3),
        'output_mb': round(mb_achieved, 3),
        'output_path': output_path,
        'phase': 'best available',
    }


def _write(data: bytes, path: str) -> None:
    with open(path, 'wb') as f:
        f.write(data)


def _report(phase: str, data: bytes, input_mb: float, output_path: str) -> dict:
    output_mb = len(data) / 1_000_000
    return {
        'status': f'success — {phase}',
        'input_mb': round(input_mb, 3),
        'output_mb': round(output_mb, 3),
        'output_path': output_path,
        'phase': phase,
    }
