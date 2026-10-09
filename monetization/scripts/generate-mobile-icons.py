#!/usr/bin/env python3
"""Generate P31 Capital Machine PWA icons (dark field, gold bars + cyan dot)."""
import os
from PIL import Image, ImageDraw

BASE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(BASE, '..', 'public', 'icons')

SIZES = {'icon-1024.png': 1024, 'icon-512.png': 512, 'icon-192.png': 192, 'icon-48.png': 48}
BG = (10, 10, 15, 255)          # #0A0A0F
GOLD = (217, 168, 75, 255)      # #D9A84B
CYAN = (34, 211, 238, 255)      # #22D3EE
DIM_GOLD = (217, 168, 75, 160)


def make_icon(size):
    img = Image.new('RGBA', (size, size), BG)
    d = ImageDraw.Draw(img)
    s = size
    # Rounded-square field (maskable-safe: keep mark inside 80% safe zone).
    m = int(s * 0.10)
    d.rounded_rectangle([m, m, s - m, s - m], radius=int(s * 0.18), fill=BG, outline=DIM_GOLD, width=max(2, s // 160))
    # Ascending bars (gold) + cyan result dot.
    cx = s * 0.50
    base_y = s * 0.72
    bar_w = s * 0.09
    gap = s * 0.05
    heights = [s * 0.22, s * 0.36, s * 0.50]
    for i, h in enumerate(heights):
        x = cx - bar_w * 1.5 + i * (bar_w + gap)
        d.rounded_rectangle([x, base_y - h, x + bar_w, base_y], radius=int(bar_w * 0.4), fill=GOLD)
    # Cyan dot above the last bar.
    x = cx - bar_w * 1.5 + 2 * (bar_w + gap) + bar_w / 2
    d.ellipse([x - s * 0.05, base_y - heights[2] - s * 0.09, x + s * 0.05, base_y - heights[2] + s * 0.01], fill=CYAN)
    return img


def main():
    os.makedirs(OUT, exist_ok=True)
    for name, size in SIZES.items():
        img = make_icon(size)
        path = os.path.join(OUT, name)
        img.save(path, 'PNG')
        print(f'  {path}  ({size}x{size})')
    # Maskable variant (full-bleed, mark inside 80%).
    img = make_icon(512)
    mask = Image.new('RGBA', (512, 512), BG)
    m = int(512 * 0.06)
    ImageDraw.Draw(mask).rounded_rectangle([m, m, 512 - m, 512 - m], radius=96, fill=BG)
    mask.alpha_composite(img)
    mask.save(os.path.join(OUT, 'maskable-512.png'), 'PNG')
    print('  public/icons/maskable-512.png  (512x512 maskable)')


if __name__ == '__main__':
    main()