#!/usr/bin/env python3
"""Downscale a PNG to JPEG.

Usage: _resize.py <input.png> <output.jpg> <width> <height>
"""
import sys
from PIL import Image

src, dst, w, h = sys.argv[1], sys.argv[2], int(sys.argv[3]), int(sys.argv[4])
im = Image.open(src)
im = im.resize((w, h), Image.LANCZOS)
if im.mode != 'RGB':
    im = im.convert('RGB')
im.save(dst, 'JPEG', quality=88, optimize=True)
print(f"wrote {dst} {w}x{h} bytes={__import__('os').path.getsize(dst)}")
