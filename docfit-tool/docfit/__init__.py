"""
docfit — Quality-first document optimizer for SARS eFiling.

Compresses PDFs, JPGs, and PNGs to meet the SARS 5 MB per-file limit
while preserving text legibility (stamps, signatures, fine print).

Usage:
    docfit optimize --in doc.pdf --out doc_ready.pdf --max-mb 5
    docfit report   --in doc.pdf
"""

__version__ = '1.0.0'
__all__ = ['optimize', 'report']
