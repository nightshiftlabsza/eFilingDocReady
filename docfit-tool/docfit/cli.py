"""
cli.py — Click command-line interface for docfit.

Commands:
    docfit optimize  — compress/merge files to meet a size target
    docfit report    — analyse a PDF and print (or save) a report
"""

import glob
import json
import os
import sys

import click

from .optimize import run_optimize, PROFILES
from .report import analyse, format_report


@click.group()
@click.version_option(package_name='docfit')
def main():
    """docfit — Quality-first document optimizer for SARS eFiling.\n
    Compresses PDFs, JPGs, and PNGs to meet the SARS 5 MB per-file limit
    while keeping text, stamps, and signatures legible.
    """


@main.command()
@click.option('--in', 'input_paths', required=True, multiple=True,
              help='Input file, glob pattern, or folder. Repeat for multiple inputs.')
@click.option('--out', 'output_path', required=True,
              help='Output PDF file path.')
@click.option('--max-mb', default=5.0, type=float, show_default=True,
              help='Maximum output size in MB.')
@click.option('--profile', default='exceptional', show_default=True,
              type=click.Choice(list(PROFILES.keys())),
              help='Compression aggressiveness profile.')
@click.option('--verbose', is_flag=True, default=False,
              help='Print progress messages.')
def optimize(input_paths, output_path, max_mb, profile, verbose):
    """Merge and compress documents to meet the SARS eFiling size limit.

    \b
    Examples:
      docfit optimize --in statement.pdf --out ready.pdf
      docfit optimize --in "docs/*.pdf" --out combined.pdf --max-mb 5
      docfit optimize --in invoice.pdf --in scan.jpg --out submission.pdf
      docfit optimize --in large.pdf --out out.pdf --profile aggressive
    """
    # Expand globs and folders
    resolved = []
    for pattern in input_paths:
        if os.path.isdir(pattern):
            for root, _, filenames in os.walk(pattern):
                for fname in sorted(filenames):
                    fpath = os.path.join(root, fname)
                    ext = os.path.splitext(fname)[1].lower()
                    if ext in ('.pdf', '.jpg', '.jpeg', '.png', '.bmp', '.gif'):
                        resolved.append(fpath)
        else:
            matched = sorted(glob.glob(pattern))
            if matched:
                resolved.extend(matched)
            elif os.path.isfile(pattern):
                resolved.append(pattern)
            else:
                click.echo(f"Warning: no files matched '{pattern}'", err=True)

    if not resolved:
        click.echo("Error: no input files found.", err=True)
        sys.exit(1)

    if verbose:
        click.echo(f"Inputs ({len(resolved)}):")
        for f in resolved:
            size_mb = os.path.getsize(f) / 1_000_000
            click.echo(f"  {f}  ({size_mb:.2f} MB)")

    max_bytes = int(max_mb * 1_000_000)
    result = run_optimize(resolved, output_path, max_bytes, profile, verbose)

    # Print result summary — ASCII-only to support Windows cp1252 terminals
    status_icon = '[OK] ' if result['status'].startswith('success') else '[!!] '
    click.echo(
        f"\n{status_icon}  {result['input_mb']:.2f} MB -> {result['output_mb']:.2f} MB"
        f"  [{result['phase']}]"
    )
    click.echo(f"   Saved: {result['output_path']}")

    if result['status'].startswith('WARNING'):
        click.echo(f"\n{result['status']}", err=True)
        sys.exit(2)  # non-zero exit so scripts can detect failure


@main.command()
@click.option('--in', 'input_path', required=True,
              help='PDF file to analyse.')
@click.option('--json', 'json_path', default=None,
              help='Optional path to save the JSON report.')
def report(input_path, json_path):
    """Analyse a PDF and print a SARS compliance report.

    \b
    Examples:
      docfit report --in statement.pdf
      docfit report --in statement.pdf --json report.json
    """
    try:
        data = analyse(input_path)
    except (FileNotFoundError, RuntimeError) as e:
        click.echo(f"Error: {e}", err=True)
        sys.exit(1)

    click.echo(format_report(data))

    if json_path:
        with open(json_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2)
        click.echo(f"\nJSON report saved: {json_path}")
