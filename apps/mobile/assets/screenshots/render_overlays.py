import json
import os
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).parent
CONFIG_PATH = ROOT / "overlay_config.json"

FONT_CANDIDATES_BOLD = [
    "/System/Library/Fonts/SFProDisplay-Bold.otf",
    "/System/Library/Fonts/SFProDisplay-Semibold.otf",
    "/System/Library/Fonts/SFProText-Semibold.otf",
    "/Library/Fonts/Arial Bold.ttf",
]

FONT_CANDIDATES_REG = [
    "/System/Library/Fonts/SFProText-Regular.otf",
    "/System/Library/Fonts/SFProDisplay-Regular.otf",
    "/Library/Fonts/Arial.ttf",
]


def pick_font(candidates, size):
    for path in candidates:
        if os.path.exists(path):
            return ImageFont.truetype(path, size=size)
    return ImageFont.load_default()


def wrap_text(draw, text, font, max_width):
    words = text.split()
    lines = []
    current = []
    for word in words:
        test = " ".join(current + [word])
        width = draw.textlength(test, font=font)
        if width <= max_width:
            current.append(word)
        else:
            if current:
                lines.append(" ".join(current))
            current = [word]
    if current:
        lines.append(" ".join(current))
    return lines


def draw_rounded_rect(mask, rect, radius, fill):
    x0, y0, x1, y1 = rect
    mask.rounded_rectangle([x0, y0, x1, y1], radius=radius, fill=fill)


def render(lang):
    with open(CONFIG_PATH, "r", encoding="utf-8") as f:
        cfg = json.load(f)

    out_dir = ROOT / "export" / lang
    out_dir.mkdir(parents=True, exist_ok=True)

    size = cfg["size"]
    bg = cfg["background"]
    text_cfg = cfg["text"]
    device_cfg = cfg["device"]

    title_size = int(text_cfg.get("title_size", 64))
    title_font = pick_font(FONT_CANDIDATES_BOLD, title_size)

    for fname, labels in cfg["screens"].items():
        src = ROOT / fname
        if not src.exists():
            print(f"Missing: {src}")
            continue

        title = labels[lang]

        canvas = Image.new("RGB", (size["width"], size["height"]), bg)
        draw = ImageDraw.Draw(canvas)

        # Title
        lines = wrap_text(draw, title, title_font, text_cfg["max_width"])
        y = text_cfg["top_padding"]
        for line in lines:
            w = draw.textlength(line, font=title_font)
            x = (size["width"] - w) / 2
            draw.text((x, y), line, fill=text_cfg["color"], font=title_font)
            y += title_font.size + text_cfg["line_spacing"]

        # Device screenshot placement
        shot = Image.open(src).convert("RGB")
        shot_w, shot_h = shot.size
        scale = min(device_cfg["max_width"] / shot_w, device_cfg["max_height"] / shot_h)
        new_w = int(shot_w * scale)
        new_h = int(shot_h * scale)
        shot = shot.resize((new_w, new_h), Image.LANCZOS)

        # Rounded mask
        mask = Image.new("L", (new_w, new_h), 0)
        mask_draw = ImageDraw.Draw(mask)
        draw_rounded_rect(mask_draw, (0, 0, new_w, new_h), device_cfg["corner_radius"], 255)

        x = (size["width"] - new_w) // 2
        y = device_cfg["top"]
        canvas.paste(shot, (x, y), mask)

        out_path = out_dir / fname
        canvas.save(out_path, format="PNG")
        print(f"Wrote {out_path}")


if __name__ == "__main__":
    render("fr")
    render("en")
