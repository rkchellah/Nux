from PIL import Image
from pathlib import Path

src = Path(
    r"C:\Users\ECSZMLPT0067\.cursor\projects\c-Users-ECSZMLPT0067-Downloads-Projects-Sightline\assets\nux-portrait-user.png"
)
out_png = Path(
    r"c:\Users\ECSZMLPT0067\Downloads\Projects\Sightline\Sightline\frontend\public\nux-portrait.png"
)

img = Image.open(src).convert("RGBA")
w, h = img.size
px = img.load()


def is_bg(x: int, y: int) -> bool:
    r, g, b, a = px[x, y]
    if a == 0:
        return False
    mx, mn = max(r, g, b), min(r, g, b)
    avg = (r + g + b) / 3
    # Light gray plate — desaturated mid/light gray
    return (mx - mn) <= 16 and 170 <= avg <= 235


visited = [[False] * w for _ in range(h)]
stack: list[tuple[int, int]] = []
for x in range(w):
    stack.append((x, 0))
    stack.append((x, h - 1))
for y in range(h):
    stack.append((0, y))
    stack.append((w - 1, y))

while stack:
    x, y = stack.pop()
    if x < 0 or y < 0 or x >= w or y >= h or visited[y][x]:
        continue
    visited[y][x] = True
    if not is_bg(x, y):
        continue
    px[x, y] = (0, 0, 0, 0)
    stack.extend(((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)))

for y in range(1, h - 1):
    for x in range(1, w - 1):
        r, g, b, a = px[x, y]
        if a == 0:
            continue
        mx, mn = max(r, g, b), min(r, g, b)
        avg = (r + g + b) / 3
        if (mx - mn) <= 18 and 165 <= avg <= 240:
            if any(px[x + dx, y + dy][3] == 0 for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))):
                px[x, y] = (0, 0, 0, 0)

bbox = img.getbbox()
if not bbox:
    raise SystemExit("empty after key")

pad = 16
l, t, r, b = bbox
img = img.crop((max(0, l - pad), max(0, t - pad), min(w, r + pad), min(h, b + pad)))

target_w = 1400
scale = target_w / img.width
target_h = max(1, int(round(img.height * scale)))
img = img.resize((target_w, target_h), Image.Resampling.LANCZOS)
img.save(out_png, "PNG", optimize=True)
print(f"ok {img.size} bytes={out_png.stat().st_size}")
