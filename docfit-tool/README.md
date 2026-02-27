# docfit — SARS eFiling Document Optimizer

Compress PDFs, JPGs, and PNGs to meet the SARS eFiling 5 MB per-file limit while keeping text, stamps, signatures, and fine print legible.

## Quick Start

```bash
# 1. Python 3.10+ required
python --version

# 2. Create virtual environment
python -m venv .venv
.venv\Scripts\activate       # Windows
# source .venv/bin/activate  # Mac/Linux

# 3. Install dependencies
pip install -r requirements.txt
pip install -e .

# 4. Verify
docfit --help
```

## Commands

### Optimize (compress + merge)

```bash
# Single PDF to under 5 MB
docfit optimize --in statement.pdf --out statement_ready.pdf

# Combine multiple files
docfit optimize --in invoice.pdf --in scan.jpg --out submission.pdf

# Use a glob pattern
docfit optimize --in "docs/*.pdf" --out combined.pdf --max-mb 5

# Aggressive mode (smaller output, lower quality threshold)
docfit optimize --in large_doc.pdf --out compressed.pdf --profile aggressive

# Verbose output (shows each compression step)
docfit optimize --in doc.pdf --out out.pdf --verbose
```

### Report (analyse before/after)

```bash
# Print a compliance report
docfit report --in statement.pdf

# Save report as JSON
docfit report --in statement.pdf --json report.json
```

## Compression Profiles

| Profile | Max quality drop | Use when |
|---|---|---|
| `exceptional` (default) | 25% | Official documents, clear text required |
| `balanced` | 40% | Most documents |
| `aggressive` | 60% | Very large files, last resort |

## SARS eFiling Constraints

| Constraint | Value |
|---|---|
| Max file size | **5 MB per file** |
| Max files per upload | 20 |
| Max files per submission | 10 |
| Accepted formats | PDF, JPG, PNG, GIF, BMP, DOC, DOCX, XLS, XLSX |
| No password protection | Files must not be encrypted |
| Safe filename | No `'` or `&` characters in filename |

## Optional: Ghostscript (enhanced compression)

Ghostscript provides additional compression via PDF re-distillation. docfit detects it automatically if installed.

Download: https://www.ghostscript.com/releases/gsdnld.html
After installing, add to PATH: `C:\Program Files\gs\gs10.x.x\bin\`

## Running Tests

```bash
pip install pytest
pytest tests/ -v
```

## Architecture

```
docfit/
├── cli.py       Click CLI — optimize + report commands
├── optimize.py  Main pipeline orchestrator
├── quality.py   Sharpness measurement + quality gate
├── pdf_ops.py   PyMuPDF: merge, lossless cleanup, rasterization, Ghostscript
├── img_ops.py   pikepdf: image extraction, classification, stream replacement
└── report.py    PDF analysis + JSON report
```
