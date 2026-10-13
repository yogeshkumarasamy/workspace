"""Generate PWA icons (run: python3 scripts/gen-icons.py). Output committed under web/public/icons."""
from PIL import Image, ImageDraw

BG = (225, 29, 72)  # rose-600 (theme)
def draw(size, maskable):
    img = Image.new("RGBA", (size, size), BG if maskable else (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    if not maskable:
        d.rounded_rectangle([0, 0, size - 1, size - 1], radius=size // 5, fill=BG)
    s = 0.56 if maskable else 0.68  # keep glyph in maskable safe zone (inner 80%)
    w = size * s; x0 = (size - w) / 2; y0 = (size - w) / 2 + size * 0.02
    r = size * 0.05
    d.rounded_rectangle([x0, y0, x0 + w, y0 + w * 0.9], radius=r, fill="white")
    d.rectangle([x0, y0 + r, x0 + w, y0 + w * 0.22], fill=(15, 15, 20))
    for fx in (0.28, 0.72):
        cx = x0 + w * fx
        d.rounded_rectangle([cx - w * 0.04, y0 - w * 0.08, cx + w * 0.04, y0 + w * 0.1], radius=w * 0.03, fill="white")
    cx, cy, t = x0 + w / 2, y0 + w * 0.57, w * 0.2
    d.polygon([(cx - t * 0.8, cy - t), (cx - t * 0.8, cy + t), (cx + t, cy)], fill=BG)
    return img

for name, size, m in [("icon-192.png", 192, False), ("icon-512.png", 512, False), ("maskable-192.png", 192, True), ("maskable-512.png", 512, True), ("apple-touch-icon.png", 180, True), ("favicon-32.png", 32, False)]:
    draw(size, m).convert("RGBA" if not m else "RGB").save(f"web/public/icons/{name}")
print("ok")
