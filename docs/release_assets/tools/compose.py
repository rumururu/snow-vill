"""Store screenshots: caption on a night-sky background + the real app capture (rounded, shadowed, bleeding
off the bottom). Outputs final/<locale>/{phone,play_phone,tablet}/NN_name.png and the feature graphic."""
import json, math, os, random
from PIL import Image, ImageDraw, ImageFilter, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
FONT = "/System/Library/Fonts/AppleSDGothicNeo.ttc"
BOLD, MED = 6, 2
NIGHT, NIGHT2, CREAM, MIST = (28, 40, 74), (58, 78, 122), (246, 240, 228), (201, 211, 230)

COPY = {
    "ko": [
        ("01_village", "친구와 함께 짓는\n겨울 마을", "링크 하나로 초대하면 친구가 집을 한 채씩 지어요"),
        ("01b_zoom", "성당 광장을 가운데 두고\n동네가 이어져요", "동네마다 아이스링크·산타의 집 같은 랜드마크"),
        ("02_photo", "집을 누르면\n친구의 사진 액자가", "사진은 집을 눌렀을 때만 잠깐 보여요"),
        ("03_claim", "9가지 집,\n문 방향까지 내 마음대로", "닉네임과 한마디, 사진 한 장을 남겨요"),
        ("04_grow", "친구가 많아지면\n동네를 열어 넓혀요", "무료 6채부터 최대 60채까지"),
        ("05_home", "회원가입 없이\n바로 시작해요", "마을을 만들고 링크만 보내면 끝"),
    ],
    "en": [
        ("01_village", "Build a winter village\nwith friends", "Share one link — each friend builds a house"),
        ("01b_zoom", "A cathedral plaza\nwith lanes around it", "An ice rink, Santa's house and more"),
        ("02_photo", "Tap a house to see\na friend's photo", "Photos only show when a house is tapped"),
        ("03_claim", "9 house types,\nany door direction", "Add a nickname, a message and one photo"),
        ("04_grow", "Grow the village\nlane by lane", "Free for 6 houses, up to 60"),
        ("05_home", "No sign-up,\nstart right away", "Create a village and share the link"),
    ],
}
# Source crop (fraction of height) per slot: drop the status bar; the grow sheet stops above the price/button rows.
PHONE_CROP = {"04_grow": (120, 2330)}
TABLET_CROP = {"04_grow": (70, 2380)}
TABLET_SRC = {"01_village": "01_village_sky"}
TABLET_SLOTS = ["01_village", "02_photo", "03_claim", "04_grow", "05_home"]


def font(size, w=BOLD):
    return ImageFont.truetype(FONT, size, index=w)


def background(w, h, seed=1, clear=None):
    bg = Image.new("RGB", (w, h))
    px = ImageDraw.Draw(bg)
    for y in range(h):
        t = y / h
        c = tuple(int(NIGHT[k] + (NIGHT2[k] - NIGHT[k]) * t) for k in range(3))
        px.line([(0, y), (w, y)], fill=c)
    # soft aurora glow near the top
    glow = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    g = ImageDraw.Draw(glow)
    g.ellipse([-w * 0.2, -h * 0.08, w * 0.75, h * 0.16], fill=(95, 227, 176, 70))
    g.ellipse([w * 0.35, -h * 0.05, w * 1.2, h * 0.14], fill=(143, 183, 255, 60))
    glow = glow.filter(ImageFilter.GaussianBlur(w * 0.08))
    bg = Image.alpha_composite(bg.convert("RGBA"), glow)
    # snow dots
    d = ImageDraw.Draw(bg)
    rnd = random.Random(seed)
    for _ in range(int(w * h / 9000)):
        x, y, r = rnd.uniform(0, w), rnd.uniform(0, h), rnd.uniform(1, 3.2) * w / 1320
        if clear and clear[0] <= x <= clear[2] and clear[1] <= y <= clear[3]:
            continue  # keep the caption area clean
        d.ellipse([x - r, y - r, x + r, y + r], fill=(255, 255, 255, rnd.randint(60, 170)))
    return bg


def rounded(im, radius):
    mask = Image.new("L", im.size, 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, im.size[0] - 1, im.size[1] - 1], radius, fill=255)
    out = im.convert("RGBA")
    out.putalpha(mask)
    return out


def text_block(canvas, lines, sub, top, w, size, sub_size):
    d = ImageDraw.Draw(canvas)
    f = font(size)
    y = top
    for line in lines.split("\n"):
        while d.textlength(line, font=f) > w * 0.9:
            f = font(f.size - 2)
    for line in lines.split("\n"):
        tw = d.textlength(line, font=f)
        d.text(((w - tw) / 2, y), line, font=f, fill=CREAM)
        y += int(f.size * 1.22)
    fs = font(sub_size, MED)
    while d.textlength(sub, font=fs) > w * 0.9:
        fs = font(fs.size - 2, MED)
    y += int(sub_size * 0.45)
    tw = d.textlength(sub, font=fs)
    d.text(((w - tw) / 2, y), sub, font=fs, fill=MIST)
    return y + int(fs.size * 1.3)


def compose(src, crop, size, headline, sub, shot_w_frac, seed, scale=1.0):
    w, h = size
    canvas = background(w, h, seed, clear=(0, 0, w, h * 0.2))
    bottom = text_block(canvas, headline, sub, int(h * 0.055), w, int(w * 0.068 * scale), int(w * 0.034 * scale))
    im = Image.open(src).convert("RGB")
    y0, y1 = crop
    im = im.crop((0, y0, im.size[0], y1))
    sw = int(w * shot_w_frac)
    sh = int(im.size[1] * sw / im.size[0])
    im = im.resize((sw, sh), Image.LANCZOS)
    top = bottom + int(h * 0.03)
    radius = int(sw * 0.06)
    shot = rounded(im, radius)
    x = (w - sw) // 2
    # shadow
    sh_layer = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    ImageDraw.Draw(sh_layer).rounded_rectangle([x + 6, top + 18, x + sw + 6, top + sh + 18], radius, fill=(0, 0, 0, 120))
    canvas = Image.alpha_composite(canvas, sh_layer.filter(ImageFilter.GaussianBlur(w * 0.02)))
    # frame border
    border = int(w * 0.008)
    frame = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    ImageDraw.Draw(frame).rounded_rectangle([x - border, top - border, x + sw + border, top + sh + border], radius + border,
                                            fill=(246, 240, 228, 255))
    canvas = Image.alpha_composite(canvas, frame)
    canvas.alpha_composite(shot, (x, top))
    return canvas.convert("RGB")


def feature_graphic(lang, out):
    w, h = 1024, 500
    canvas = background(w, h, 7, clear=(0, 0, 440, h))
    art = Image.open(f"{HERE}/cap/{lang}/01b_zoom.png").convert("RGB").crop((60, 470, 1260, 1700))
    aw = 560
    art = art.resize((aw, int(art.size[1] * aw / art.size[0])), Image.LANCZOS)
    art = rounded(art, 36)
    canvas.alpha_composite(art.crop((0, 0, aw, h - 60)), (w - aw - 30, 30))
    d = ImageDraw.Draw(canvas)
    title, tag = ("Snow Village", "친구와 함께 짓는\n겨울 마을") if lang == "ko" else ("Snow Village", "Build a winter\nvillage with friends")
    d.text((48, 120), title, font=font(64), fill=CREAM)
    y = 215
    for line in tag.split("\n"):
        d.text((50, y), line, font=font(38, MED), fill=MIST)
        y += 50
    canvas.convert("RGB").save(out)


def main():
    manifest = []
    for lang, slots in COPY.items():
        for n, (slot, head, sub) in enumerate(slots, 1):
            src = f"{HERE}/cap/{lang}/{slot}.png"
            crop = PHONE_CROP.get(slot, (120, 2868))
            for kind, size, frac in (("phone", (1320, 2868), 0.84), ("play_phone", (1080, 1920), 0.70)):
                out = f"{HERE}/final/{lang}/{kind}/{n:02d}_{slot}.png"
                os.makedirs(os.path.dirname(out), exist_ok=True)
                compose(src, crop, size, head, sub, frac, n).save(out)
                manifest.append({"file": os.path.relpath(out, HERE), "source": os.path.relpath(src, HERE), "size": size})
        k = 0
        for slot, head, sub in slots:
            if slot not in TABLET_SLOTS:
                continue
            k += 1
            src = f"{HERE}/capi/{lang}/{TABLET_SRC.get(slot, slot)}.png"
            out = f"{HERE}/final/{lang}/tablet/{k:02d}_{slot}.png"
            os.makedirs(os.path.dirname(out), exist_ok=True)
            compose(src, TABLET_CROP.get(slot, (70, 2752)), (2064, 2752), head, sub, 0.80, k, scale=0.8).save(out)
            manifest.append({"file": os.path.relpath(out, HERE), "source": os.path.relpath(src, HERE), "size": (2064, 2752)})
        os.makedirs(f"{HERE}/final/{lang}/common", exist_ok=True)
        feature_graphic(lang, f"{HERE}/final/{lang}/common/feature_graphic_1024x500.png")
    json.dump(manifest, open(f"{HERE}/final/manifest.json", "w"), indent=1)
    print(len(manifest), "screenshots")


if __name__ == "__main__":
    main()
