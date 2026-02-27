"""
report.py — PDF analysis and JSON report generation.

Provides an 'analyse' function that inspects a PDF and returns a structured
dictionary describing its size, pages, images, DPI estimates, and SARS
eFiling compliance checks.
"""

import os

import fitz  # PyMuPDF


def analyse(pdf_path: str) -> dict:
    """
    Analyse a PDF file and return a structured report dict.

    Checks performed:
    - File size vs SARS 5 MB limit
    - Page count
    - Number of embedded images
    - Presence of a text layer (vs pure scanned images)
    - Estimated image DPI (min, max, average)
    - Password protection status
    - Filename safety (SARS rejects filenames with ' and & characters)
    """
    if not os.path.isfile(pdf_path):
        raise FileNotFoundError(f"File not found: {pdf_path}")

    file_size = os.path.getsize(pdf_path)

    try:
        doc = fitz.open(pdf_path)
        encrypted = doc.is_encrypted
        if encrypted:
            return {
                'file': pdf_path,
                'file_size_bytes': file_size,
                'file_size_mb': round(file_size / 1_000_000, 3),
                'pages': None,
                'total_images': None,
                'has_text_layer': None,
                'is_scanned_images': None,
                'estimated_dpi_min': None,
                'estimated_dpi_max': None,
                'estimated_dpi_avg': None,
                'within_sars_limit': file_size <= 5_000_000,
                'quality_checks': {
                    'not_password_protected': False,
                    'filename_safe': _filename_safe(pdf_path),
                },
            }
    except Exception as e:
        raise RuntimeError(f"Could not open PDF: {e}") from e

    pages = len(doc)
    total_images = 0
    has_text = False
    dpi_estimates = []

    for page in doc:
        text = page.get_text().strip()
        if text:
            has_text = True

        for img_info in page.get_images(full=True):
            total_images += 1
            xref = img_info[0]
            try:
                pix = fitz.Pixmap(doc, xref)
                page_w_in = page.rect.width / 72.0
                if page_w_in > 0 and pix.width > 0:
                    dpi_estimates.append(pix.width / page_w_in)
            except Exception:
                pass  # skip unreadable image streams

    doc.close()

    return {
        'file': pdf_path,
        'file_size_bytes': file_size,
        'file_size_mb': round(file_size / 1_000_000, 3),
        'pages': pages,
        'total_images': total_images,
        'has_text_layer': has_text,
        'is_scanned_images': total_images > 0 and not has_text,
        'estimated_dpi_min': round(min(dpi_estimates)) if dpi_estimates else None,
        'estimated_dpi_max': round(max(dpi_estimates)) if dpi_estimates else None,
        'estimated_dpi_avg': round(sum(dpi_estimates) / len(dpi_estimates)) if dpi_estimates else None,
        'within_sars_limit': file_size <= 5_000_000,
        'quality_checks': {
            'not_password_protected': True,
            'filename_safe': _filename_safe(pdf_path),
        },
    }


def _filename_safe(path: str) -> bool:
    """SARS rejects filenames containing apostrophes or ampersands."""
    name = os.path.basename(path)
    return "'" not in name and '&' not in name


def format_report(report: dict) -> str:
    """Return a human-readable text summary of an analysis report.

    Uses ASCII-only OK/FAIL markers so the output is safe on Windows
    terminals that use cp1252 or other non-Unicode code pages.
    """
    OK   = '[OK]  '
    FAIL = '[!!]  '
    lines = [
        f"File       : {report['file']}",
        f"Size       : {report['file_size_mb']} MB  "
        f"({OK + 'within SARS 5 MB limit' if report['within_sars_limit'] else FAIL + 'EXCEEDS 5 MB SARS limit'})",
    ]
    if report['pages'] is not None:
        lines.append(f"Pages      : {report['pages']}")
    if report['total_images'] is not None:
        lines.append(f"Images     : {report['total_images']}")
    if report['has_text_layer'] is not None:
        kind = 'scanned images only' if report['is_scanned_images'] else (
               'text + images' if report['total_images'] else 'text only')
        lines.append(f"Content    : {kind}")
    if report['estimated_dpi_avg'] is not None:
        lines.append(
            f"Est. DPI   : avg {report['estimated_dpi_avg']}  "
            f"(min {report['estimated_dpi_min']}, max {report['estimated_dpi_max']})"
        )
    qc = report['quality_checks']
    pw_ok = qc['not_password_protected']
    lines.append(f"No password: {OK if pw_ok else FAIL + 'encrypted -- SARS will reject this'}")
    fn_ok = qc['filename_safe']
    lines.append(f"Safe name  : {OK if fn_ok else FAIL + 'filename contains apostrophe or & -- rename before upload'}")
    return '\n'.join(lines)
