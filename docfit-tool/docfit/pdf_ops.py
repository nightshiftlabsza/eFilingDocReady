"""
pdf_ops.py — PyMuPDF operations: merge, lossless cleanup, rasterization, Ghostscript.
"""

import io
import os
import shutil
import subprocess
import tempfile

import fitz  # PyMuPDF


def merge_inputs(file_paths: list) -> bytes:
    """
    Merge a list of PDFs and/or images (JPG, PNG) into a single PDF bytes object.
    Each image becomes one page at its natural resolution.
    """
    out = fitz.open()
    for path in file_paths:
        ext = os.path.splitext(path)[1].lower()
        if ext in ('.jpg', '.jpeg', '.png', '.bmp', '.gif', '.tiff', '.tif', '.webp'):
            img_doc = fitz.open(path)
            pdf_bytes = img_doc.convert_to_pdf()
            img_doc.close()
            src = fitz.open("pdf", pdf_bytes)
        elif ext == '.pdf':
            src = fitz.open(path)
        else:
            # Try opening as-is and let PyMuPDF decide
            src = fitz.open(path)
        out.insert_pdf(src)
        src.close()
    merged = out.tobytes(garbage=2, deflate=True)
    out.close()
    return merged


def lossless_cleanup(pdf_bytes: bytes) -> bytes:
    """
    Apply PyMuPDF's structural lossless cleanup:
      - garbage=4: remove all unreferenced objects + compact xref
      - deflate=True: compress all streams
      - clean=True: sanitize content streams
    Typically achieves 10-40% size reduction with zero quality loss.
    """
    doc = fitz.open("pdf", pdf_bytes)
    result = doc.tobytes(garbage=4, deflate=True, clean=True, pretty=False)
    doc.close()
    return result


def rasterize(pdf_bytes: bytes, dpi: int, jpeg_quality: int) -> bytes:
    """
    Render every page to greyscale JPEG at the given DPI and rebuild as a PDF.
    This is the last-resort compression method — vector text becomes a raster image.

    Greyscale (not RGB) is used because:
    - SARS eFiling officially recommends black-and-white scanning.
    - A greyscale JPEG is ~3x smaller than RGB at the same DPI and quality,
      making it far more likely to fit under the 5 MB limit at 300 DPI.
    """
    src = fitz.open("pdf", pdf_bytes)
    out = fitz.open()

    for page in src:
        mat = fitz.Matrix(dpi / 72, dpi / 72)
        pix = page.get_pixmap(matrix=mat, colorspace=fitz.csGRAY)
        jpeg_bytes = pix.tobytes("jpeg", jpg_quality=jpeg_quality)

        # Create a new page the same size as the original, insert the JPEG
        img_doc = fitz.open()
        img_doc.new_page(width=page.rect.width, height=page.rect.height)
        img_page = img_doc[-1]
        img_page.insert_image(img_page.rect, stream=jpeg_bytes)
        out.insert_pdf(img_doc)
        img_doc.close()

    result = out.tobytes(garbage=2, deflate=True)
    src.close()
    out.close()
    return result


def ghostscript_available() -> bool:
    """Return True if a Ghostscript binary is reachable on this system."""
    # Common Windows install paths
    windows_paths = [
        r'C:\Program Files\gs\gs10.04.0\bin\gswin64c.exe',
        r'C:\Program Files\gs\gs10.03.1\bin\gswin64c.exe',
        r'C:\Program Files\gs\gs10.03.0\bin\gswin64c.exe',
        r'C:\Program Files\gs\gs10.02.1\bin\gswin64c.exe',
        r'C:\Program Files (x86)\gs\gs10.04.0\bin\gswin32c.exe',
    ]
    # Check PATH first (covers Linux/macOS and properly configured Windows)
    if shutil.which('gs') or shutil.which('gswin64c'):
        return True
    # Check common Windows directories
    return any(os.path.isfile(p) for p in windows_paths)


def _get_ghostscript_exe() -> str:
    """Return the path to the Ghostscript executable."""
    gs_on_path = shutil.which('gs') or shutil.which('gswin64c')
    if gs_on_path:
        return gs_on_path
    windows_paths = [
        r'C:\Program Files\gs\gs10.04.0\bin\gswin64c.exe',
        r'C:\Program Files\gs\gs10.03.1\bin\gswin64c.exe',
        r'C:\Program Files\gs\gs10.03.0\bin\gswin64c.exe',
        r'C:\Program Files\gs\gs10.02.1\bin\gswin64c.exe',
        r'C:\Program Files (x86)\gs\gs10.04.0\bin\gswin32c.exe',
    ]
    for p in windows_paths:
        if os.path.isfile(p):
            return p
    raise FileNotFoundError("Ghostscript not found")


def ghostscript_compress(pdf_bytes: bytes, pdf_setting: str = '/printer') -> bytes:
    """
    Compress a PDF using Ghostscript's re-distillation pipeline.
    pdf_setting: '/screen', '/ebook', '/printer', or '/prepress'
    Returns the compressed PDF bytes, or the original bytes if GS fails.
    """
    gs_exe = _get_ghostscript_exe()
    with tempfile.NamedTemporaryFile(suffix='.pdf', delete=False) as tmp_in:
        tmp_in.write(pdf_bytes)
        tmp_in_path = tmp_in.name
    tmp_out_path = tmp_in_path.replace('.pdf', '_gs.pdf')
    try:
        cmd = [
            gs_exe,
            '-dBATCH', '-dNOPAUSE', '-dQUIET',
            '-sDEVICE=pdfwrite',
            f'-dPDFSETTINGS={pdf_setting}',
            '-dCompatibilityLevel=1.4',
            f'-sOutputFile={tmp_out_path}',
            tmp_in_path,
        ]
        subprocess.run(cmd, timeout=120, check=True,
                       stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        with open(tmp_out_path, 'rb') as f:
            return f.read()
    except Exception:
        return pdf_bytes  # graceful fallback — return original on any error
    finally:
        for p in (tmp_in_path, tmp_out_path):
            try:
                os.unlink(p)
            except OSError:
                pass
