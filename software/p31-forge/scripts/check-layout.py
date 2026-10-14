#!/usr/bin/env python3
"""
check-layout.py — layout defect gate (Visual Typesetting Optimization, practical).

Research basis: PaperFit (arXiv 2605.10341) formalizes Visual Typesetting
Optimization — iteratively render pages, diagnose defects, apply constrained
repairs — with a five-category taxonomy. The pdf-audit toolkit detects margin
overflow, stuck words, orphan punctuation, justify gaps, widows/orphans,
rivers, and asymmetric margins. This gate implements the subset detectable
from extracted text without an image analyzer:

  1. widow page     — a content page with < 3 lines of body text
  2. widow heading  — a page that ends with a section heading (stranded at
                      the bottom of the page)
  3. orphan page    — a page whose first body line is a single word/short
                      fragment (a paragraph's first line left alone)
  4. cover leak     — a running footer appearing on the cover page
  5. budget         — page count > --max-pages

Hard-fails on any of 1-4. The vision-in-the-loop version (render pages to
images, analyze margins/rivers/balance) is the PaperFit pattern and is the
next step — recorded, not built.

Usage:
  python3 scripts/check-layout.py /tmp/report/<session>.report.pdf
Exit 0 = clean; 1 = a defect found.
"""
import sys
import re
import json
import argparse
import os

try:
    from PyPDF2 import PdfReader
except ImportError:
    print("check-layout: PyPDF2 not installed", file=sys.stderr)
    sys.exit(2)


def _lin(c):
    c = c / 255.0
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4


def _lum(hx):
    hx = hx.lstrip('#')
    r, g, b = int(hx[0:2], 16), int(hx[2:4], 16), int(hx[4:6], 16)
    return 0.2126 * _lin(r) + 0.7152 * _lin(g) + 0.0722 * _lin(b)


def contrast_ratio(fg, bg):
    l1, l2 = _lum(fg), _lum(bg)
    hi, lo = max(l1, l2), min(l1, l2)
    return (hi + 0.05) / (lo + 0.05)


HEADING_RE = re.compile(r"^(Consensus|Divergence|Synthesis|Evidence Appendix|Executive Summary|Methodology)$")
FOOTER_RE = re.compile(r"(p31ca\.org|CC BY-SA|github\.com/p31labs|P31 LABS //|P31 LABS, INC|^P31 LABS$|^PAGE \d+$|PAGE \d+)")
# Card labels in the summary-cards grid — a lone label line is a layout
# artifact of the card grid, not a paragraph orphan.
LABEL_RE = re.compile(r"^(QUESTION|TAKEAWAY|KEY FINDINGS)$", re.IGNORECASE)


def lines_of(page_text):
    return [l.strip() for l in page_text.split("\n") if l.strip()]


def check(pdf_path, max_pages=20, cover_pages=1):
    reader = PdfReader(pdf_path)
    pages = len(reader.pages)
    findings = []

    if pages > max_pages:
        findings.append(f"budget: {pages} pages > {max_pages}")

    for i, page in enumerate(reader.pages):
        text = page.extract_text() or ""
        lines = lines_of(text)
        # Strip the running footer lines (they appear at the bottom).
        body = [l for l in lines if not FOOTER_RE.search(l)]

        # 4. cover leak — footer should NOT be on the cover
        if i < cover_pages:
            if FOOTER_RE.search(text):
                findings.append(f"cover leak: footer on cover page {i + 1}")
            continue

        # 1. widow page — fewer than 3 body lines on a content page.
        #    The methodology colophon (appendix tail) is a legitimate short page.
        if len(body) < 3 and "jitterbug research" not in text.lower():
            findings.append(f"widow page: page {i + 1} has {len(body)} body lines")
            continue

        # 2. widow heading — page ends with a section heading
        last = body[-1]
        if HEADING_RE.match(last):
            findings.append(f"widow heading: page {i + 1} ends with '{last}'")

        # 3. orphan page — first body line is a single word/short fragment AND
        #    the page is nearly empty (a stranded line at the top). A page that
        #    starts mid-sentence and continues with a full bullet is NOT an
        #    orphan — it is prose continuation across the page break. Only a
        #    genuine stranded line (fragment + little else) is a defect.
        first = body[0]
        if (
            len(first.split()) <= 2
            and not HEADING_RE.match(first)
            and not LABEL_RE.match(first)
            and len(body) <= 3  # stranded: just the fragment + a line or two
        ):
            findings.append(f"orphan page: page {i + 1} starts with '{first}'")

    return pages, findings


def check_pack_gates(pack_path, pdf_pages):
    """Per-template gates from the packer JSON (scripts/pack-pages.mjs output).
    Failures here are packing defects, not typography defects."""
    with open(pack_path) as f:
        pack = json.load(f)
    gates = pack.get("gates") or {}
    pages_info = pack.get("pages") or []
    findings = []
    is_flow = pack.get("mode") == "flow"

    # Measured-page gates need packer geometry — flow modes skip them.
    if not is_flow:
        rng = gates.get("pageCountRange")
        if rng and not (rng[0] <= pdf_pages <= rng[1]):
            findings.append(f"page count {pdf_pages} outside {rng}")

        max_pages = gates.get("maxPages")
        if max_pages and pdf_pages > max_pages:
            findings.append(f"maxPages: {pdf_pages} > {max_pages}")

        min_fill = gates.get("minFill")
        exempt = gates.get("minFillExempt") or []
        for p in pages_info:
            fill = p.get("fillPct")
            units = p.get("units") or []
            if min_fill and fill is not None and fill < min_fill * 100:
                if "cover" in exempt and p.get("n") == 1:
                    continue
                if "colophon" in exempt and any("methodology" in str(u) for u in units):
                    continue
                if "figure" in exempt and any("figure" in str(u) for u in units):
                    continue
                findings.append(f"fill: page {p.get('n')} at {fill}% < {min_fill * 100:.0f}%")

        if gates.get("noSplitAtoms"):
            # Atom-level splits are enforced by CSS (break-inside:avoid on cards,
            # rows, paragraphs, callouts). Oversize units fragment BETWEEN atoms;
            # verify visually, warn here.
            for p in pages_info:
                if p.get("overflow"):
                    print(f"⚠  fragmented unit on page {p.get('n')} — fragments between atoms (verify visually)", file=sys.stderr)

        if gates.get("appendixOwnPage"):
            for p in pages_info:
                units = p.get("units") or []
                app = [u for u in units if "appendix" in str(u)]
                if app and units[0] != app[0]:
                    findings.append(f"appendix own page: appendix on page {p.get('n')} does not start it")

    # Required sections: runbooks must contain the standard seven.
    if gates.get("requiredSections"):
        have = [str(s.get("id", "")).lower() for s in pack.get("sections") or []]
        for req in gates["requiredSections"]:
            if not any(req.lower() in h or req.lower().replace(" ", "-") in h for h in have):
                findings.append(f"requiredSection: '{req}' missing from {pack.get('template')}")

    # Word budget: fail sections that exceed their declared budget.
    if gates.get("wordBudget"):
        for s in pack.get("sections") or []:
            if s.get("budget") and s.get("words", 0) > s["budget"]:
                findings.append(f"wordBudget: {s['id']} {s['words']} words > {s['budget']}")

    # Contrast: WCAG 2.2 pairs for the active theme (contrast-pairs.json).
    theme = pack.get("theme")
    if theme:
        pairs_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "booklet", "layout", "contrast-pairs.json")
        try:
            with open(pairs_path) as f:
                pairs = json.load(f).get(theme) or []
            for fg, bg, mn in pairs:
                r = contrast_ratio(fg, bg)
                if r < mn:
                    findings.append(f"contrast: {theme} {fg} on {bg} = {r:.2f} < {mn}")
        except FileNotFoundError:
            print("⚠  no contrast pairs file — contrast gate skipped", file=sys.stderr)

    return findings


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("pdf")
    ap.add_argument("--max-pages", type=int, default=20)
    ap.add_argument("--cover-pages", type=int, default=1)
    ap.add_argument("--pack", default=None, help="packer JSON with per-template gates")
    args = ap.parse_args()

    pages, findings = check(args.pdf, args.max_pages, args.cover_pages)
    if args.pack:
        try:
            findings += check_pack_gates(args.pack, pages)
        except Exception as e:
            findings.append(f"pack gate error: {e}")

    if findings:
        print(f"❌ LAYOUT GATE FAILED ({pages} pages):")
        for f in findings:
            print(f"  - {f}")
        sys.exit(1)
    print(f"✅ LAYOUT GATE PASSED — {pages} pages, no widow/orphan/cover-leak defects.")


if __name__ == "__main__":
    main()