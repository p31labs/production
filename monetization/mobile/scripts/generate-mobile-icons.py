#!/usr/bin/env python3
"""Generate P31 Capital Machine icon assets for iOS and Android using Pillow.

Mark: ascending gold bars (#D9A84B) on a dark field (#0A0A0F) with a
cyan result dot (#22D3EE) — a minimal upward-trend "capital machine" mark.
"""

import os
import json
from PIL import Image, ImageDraw

# mobile/ is the parent of scripts/
BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(BASE, 'resources')

DARK = (10, 10, 15, 255)          # #0A0A0F
GOLD = (217, 168, 75, 255)        # #D9A84B
CYAN = (34, 211, 238, 255)        # #22D3EE

SIZES = {
    'icon-1024.png': 1024,
    'icon-512.png': 512,
    'icon-192.png': 192,
    'icon-48.png': 48,
}


def make_icon(size):
    img = Image.new('RGBA', (size, size), DARK)
    draw = ImageDraw.Draw(img)

    # Subtle circular field for depth (barely-visible on dark)
    cx = cy = size // 2
    r = size * 0.46
    draw.ellipse([cx - r, cy - r, cx + r, cy + r], fill=(255, 255, 255, 8))

    # Ascending gold accent bars (pill/rounded) + cyan result dot
    bar_w = size * 0.14
    bar_half = bar_w / 2
    baseline = size * 0.70
    heights = [size * 0.16, size * 0.28, size * 0.42]
    xs = [size * 0.28, size * 0.50, size * 0.72]

    for x, h in zip(xs, heights):
        top = baseline - h
        bottom = baseline
        draw.rounded_rectangle(
            [x - bar_half, top, x + bar_half, bottom],
            radius=bar_half,
            fill=GOLD,
        )

    # Cyan dot as the apex / result marker above the tallest bar
    dot_x, dot_h = xs[-1], heights[-1]
    dot_r = size * 0.045
    draw.ellipse(
        [dot_x - dot_r, baseline - dot_h - dot_r * 2.6, dot_x + dot_r, baseline - dot_h - dot_r * 0.6],
        fill=CYAN,
    )

    return img


def main():
    os.makedirs(OUT, exist_ok=True)

    for name, size in SIZES.items():
        img = make_icon(size)
        path = os.path.join(OUT, name)
        img.save(path, 'PNG')
        print(f'  {path}  ({size}x{size})')

    # Copy to Android (only if `cap add android` has been run)
    android_res = os.path.join(BASE, 'android', 'app', 'src', 'main', 'res')
    if os.path.isdir(android_res):
        icon_512 = Image.open(os.path.join(OUT, 'icon-512.png'))
        android_dirs = {
            'mipmap-mdpi': 48,
            'mipmap-hdpi': 72,
            'mipmap-xhdpi': 96,
            'mipmap-xxhdpi': 144,
            'mipmap-xxxhdpi': 192,
        }
        for dir_name, px in android_dirs.items():
            d = os.path.join(android_res, dir_name)
            os.makedirs(d, exist_ok=True)
            img = icon_512.resize((px, px), Image.Resampling.LANCZOS)
            img.save(os.path.join(d, 'ic_launcher.png'), 'PNG')
            img.save(os.path.join(d, 'ic_launcher_round.png'), 'PNG')
            print(f'  {d}/ic_launcher.png ({px}x{px})')

        adapt_dir = os.path.join(android_res, 'mipmap-xxxhdpi')
        os.makedirs(adapt_dir, exist_ok=True)
        fg = make_icon(432)
        fg.save(os.path.join(adapt_dir, 'ic_launcher_foreground.png'), 'PNG')
        bg = Image.new('RGBA', (432, 432), DARK)
        bg.save(os.path.join(adapt_dir, 'ic_launcher_background.png'), 'PNG')
        print(f'  {adapt_dir}/ic_launcher_foreground.png (432x432)')

    # Copy to iOS (only if `cap add ios` has been run)
    ios_assets = os.path.join(BASE, 'ios', 'App', 'App', 'Assets.xcassets')
    if os.path.isdir(ios_assets):
        appicon = os.path.join(ios_assets, 'AppIcon.appiconset')
        os.makedirs(appicon, exist_ok=True)
        icon_1024 = Image.open(os.path.join(OUT, 'icon-1024.png'))
        icon_1024.save(os.path.join(appicon, 'icon-1024.png'), 'PNG')
        print(f'  {appicon}/icon-1024.png (1024x1024)')

        contents = {
            "images": [
                {"size": "20x20", "idiom": "iphone", "filename": "icon-1024.png", "scale": "3x"},
                {"size": "29x29", "idiom": "iphone", "filename": "icon-1024.png", "scale": "3x"},
                {"size": "40x40", "idiom": "iphone", "filename": "icon-1024.png", "scale": "3x"},
                {"size": "60x60", "idiom": "iphone", "filename": "icon-1024.png", "scale": "3x"},
                {"size": "20x20", "idiom": "ipad", "filename": "icon-1024.png", "scale": "2x"},
                {"size": "29x29", "idiom": "ipad", "filename": "icon-1024.png", "scale": "2x"},
                {"size": "40x40", "idiom": "ipad", "filename": "icon-1024.png", "scale": "2x"},
                {"size": "76x76", "idiom": "ipad", "filename": "icon-1024.png", "scale": "2x"},
                {"size": "83.5x83.5", "idiom": "ipad", "filename": "icon-1024.png", "scale": "2x"},
                {"size": "1024x1024", "idiom": "ios-marketing", "filename": "icon-1024.png", "scale": "1x"},
            ],
            "info": {"author": "xcode", "version": 1}
        }
        with open(os.path.join(appicon, 'Contents.json'), 'w') as f:
            json.dump(contents, f, indent=2)
        print(f'  {appicon}/Contents.json updated')

    print('\nDone. App icons generated.')


if __name__ == '__main__':
    main()