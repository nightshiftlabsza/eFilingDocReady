"""
img_ops.py — pikepdf image extraction, classification, and stream replacement.

Replaces image XObjects inside a PDF with recompressed JPEG bytes while
leaving all vector text, fonts, and annotations completely untouched.
"""

import io

import numpy as np
import pikepdf
from PIL import Image
from pikepdf import PdfImage


def classify_image(img: Image.Image) -> str:
    """
    Classify a PIL image as 'lineart' (B&W documents, stamps, signatures)
    or 'photo' (photographs, colour scans).

    Lineart gets a higher JPEG quality offset to preserve fine detail at
    stamps, fine print, and signature edges.
    """
    gray = np.array(img.convert('L'), dtype=np.float32)
    std = gray.std()
    sampled = gray[::4, ::4]
    # Divide by min(samples, 256) — unique grey values are capped at 256,
    # so dividing by sample count gives a misleadingly small ratio for large images.
    unique_ratio = len(np.unique(sampled)) / min(sampled.size, 256)

    if std < 40 or unique_ratio < 0.15:
        return 'lineart'

    if img.mode == 'RGB':
        arr = np.array(img)
        channel_spread = float(
            (arr[:, :, 0].astype(int) - arr[:, :, 1].astype(int)).std()
        )
        if channel_spread < 8:  # effectively greyscale
            return 'lineart'

    return 'photo'


def recompress_images(pdf_bytes: bytes, jpeg_quality: int,
                      lineart_offset: int = 0) -> bytes:
    """
    Walk every image XObject in the PDF and replace it with a JPEG-compressed
    version if doing so reduces the image size.

    Args:
        pdf_bytes:      input PDF as bytes
        jpeg_quality:   base JPEG quality (1-95)
        lineart_offset: extra quality added for lineart images (e.g. +15)

    Returns:
        PDF bytes with recompressed images. Vector content is untouched.
    """
    in_buf = io.BytesIO(pdf_bytes)
    with pikepdf.open(in_buf) as pdf:
        seen_xrefs = set()

        for page in pdf.pages:
            if '/Resources' not in page or '/XObject' not in page.Resources:
                continue

            for name in list(page.Resources.XObject.keys()):
                # pikepdf 8+ auto-resolves indirect references on dict access —
                # no .get_object() call needed (method was removed in pikepdf 8+).
                obj = page.Resources.XObject[name]

                # Skip non-image XObjects — guard against form XObjects etc.
                try:
                    if '/Subtype' not in obj or str(obj.Subtype) != '/Image':
                        continue
                except Exception:
                    continue

                # Deduplicate shared image objects
                try:
                    xref_id = obj.objgen
                except Exception:
                    continue
                if xref_id in seen_xrefs:
                    continue
                seen_xrefs.add(xref_id)

                try:
                    pil_img = PdfImage(obj).as_pil_image()
                    kind = classify_image(pil_img)
                    q = min(jpeg_quality + (lineart_offset if kind == 'lineart' else 0), 95)

                    # Convert to an appropriate colour space for JPEG
                    if kind == 'lineart':
                        pil_out = pil_img.convert('L')
                        colorspace = pikepdf.Name('/DeviceGray')
                    else:
                        pil_out = pil_img.convert('RGB')
                        colorspace = pikepdf.Name('/DeviceRGB')

                    buf = io.BytesIO()
                    pil_out.save(buf, 'JPEG', quality=q, optimize=True)
                    new_bytes = buf.getvalue()

                    # Only replace if the new bytes are actually smaller
                    try:
                        original_size = len(obj.read_raw_bytes())
                    except Exception:
                        original_size = len(pdf_bytes)  # conservative fallback

                    if len(new_bytes) >= original_size:
                        continue

                    w, h = pil_out.size
                    # pikepdf 8+ make_stream requires plain string keys (not Name objects)
                    new_stream = pdf.make_stream(
                        new_bytes,
                        {
                            '/Type':             pikepdf.Name('/XObject'),
                            '/Subtype':          pikepdf.Name('/Image'),
                            '/Width':            w,
                            '/Height':           h,
                            '/ColorSpace':       colorspace,
                            '/BitsPerComponent': 8,
                            '/Filter':           pikepdf.Name('/DCTDecode'),
                        }
                    )
                    page.Resources.XObject[name] = pdf.make_indirect(new_stream)

                except Exception:
                    # Never crash on a single image — skip and continue
                    continue

        out_buf = io.BytesIO()
        pdf.save(out_buf, compress_streams=True)
        return out_buf.getvalue()
