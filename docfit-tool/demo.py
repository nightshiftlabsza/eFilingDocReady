"""
demo.py — Optimize all PDFs in a sample folder and print a report.

Usage:
    python demo.py
    python demo.py sample_docs/

Place some PDFs in a folder named 'sample_docs' (or pass a path as argv[1]).
"""

import glob
import json
import os
import sys

from docfit.optimize import run_optimize
from docfit.report import analyse, format_report


def main():
    folder = sys.argv[1] if len(sys.argv) > 1 else 'sample_docs'
    pdfs = sorted(glob.glob(os.path.join(folder, '*.pdf')))

    if not pdfs:
        print(f"No PDFs found in '{folder}'. Create the folder and add some PDFs.")
        return

    print(f"Found {len(pdfs)} PDF(s) in '{folder}'\n")
    print('=' * 60)

    for pdf_path in pdfs:
        out_path = pdf_path.replace('.pdf', '_optimized.pdf')
        original_mb = os.path.getsize(pdf_path) / 1_000_000

        print(f"\nProcessing: {os.path.basename(pdf_path)}  ({original_mb:.2f} MB)")
        result = run_optimize([pdf_path], out_path, max_bytes=5_000_000,
                               profile_name='exceptional', verbose=True)

        print(f"\nResult: {result['input_mb']:.2f} MB → {result['output_mb']:.2f} MB")
        print(f"Status: {result['status']}")

        if os.path.isfile(out_path):
            report = analyse(out_path)
            print('\nReport:')
            print(format_report(report))

        print('-' * 60)


if __name__ == '__main__':
    main()
