#!/usr/bin/env python3
"""Generate a Gemini-style sparkle icon (1024x1024) for `tauri icon`."""
from PIL import Image, ImageDraw, ImageFilter

S = 1024
img = Image.new("RGBA", (S, S), (0, 0, 0, 0))

# Rounded-square dark background
bg = Image.new("RGBA", (S, S), (0, 0, 0, 0))
d = ImageDraw.Draw(bg)
d.rounded_rectangle([0, 0, S - 1, S - 1], radius=int(S * 0.22), fill=(19, 19, 20, 255))
img = Image.alpha_composite(img, bg)

# Four-point star via astroid-like superellipse, elongated vertically
cx, cy = S / 2, S / 2
a = S * 0.40  # vertical half-axis
b = S * 0.22  # horizontal half-axis
p = 0.62      # concavity exponent

mask = Image.new("L", (S, S), 0)
px = mask.load()
for y in range(S):
    dy = abs(y - cy) / a
    if dy > 1:
        continue
    # |x/b|^p = 1 - |y/a|^p
    rem = 1 - dy**p
    if rem <= 0:
        continue
    xmax = b * rem ** (1 / p)
    x0, x1 = int(cx - xmax), int(cx + xmax) + 1
    for x in range(max(0, x0), min(S, x1)):
        px[x, y] = 255

# Gradient fill: blue -> purple -> pink, top to bottom
grad = Image.new("RGBA", (S, S))
gp = grad.load()
top = (75, 144, 255)
mid = (155, 114, 203)
bot = (255, 85, 70)
for y in range(S):
    t = y / (S - 1)
    if t < 0.5:
        k = t / 0.5
        c = tuple(int(top[i] + (mid[i] - top[i]) * k) for i in range(3))
    else:
        k = (t - 0.5) / 0.5
        c = tuple(int(mid[i] + (bot[i] - mid[i]) * k) for i in range(3))
    for x in range(S):
        gp[x, y] = (*c, 255)

# Soft glow behind star
glow = Image.new("RGBA", (S, S), (0, 0, 0, 0))
glow.paste(grad, (0, 0), mask)
glow = glow.filter(ImageFilter.GaussianBlur(S * 0.06))
img = Image.alpha_composite(img, glow)

# Sharp star on top
star = Image.new("RGBA", (S, S), (0, 0, 0, 0))
star.paste(grad, (0, 0), mask)
img = Image.alpha_composite(img, star)

# Small sparkle accent top-right
m2 = Image.new("L", (S, S), 0)
px2 = m2.load()
c2x, c2y = S * 0.76, S * 0.24
a2, b2 = S * 0.10, S * 0.055
for y in range(S):
    dy = abs(y - c2y) / a2
    if dy > 1:
        continue
    rem = 1 - dy**p
    if rem <= 0:
        continue
    xmax = b2 * rem ** (1 / p)
    for x in range(int(c2x - xmax), int(c2x + xmax) + 1):
        px2[x, y] = 230
img.paste(grad, (0, 0), m2)

img.save("icon-src.png")
print("wrote icon-src.png")
