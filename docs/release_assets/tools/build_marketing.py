"""Snow Village store images — designed composites (after Claire's Ranch `tools/build_ranch_marketing.py`).

Each slide is laid out in HTML/CSS (caption in a rounded display font, the real app capture in a snow-capped
wooden frame, tilted, sometimes with a second inset frame) and rendered to PNG by installed Google Chrome headless.

  python3 docs/release_assets/tools/build_marketing.py               # all locales and sizes
  python3 docs/release_assets/tools/build_marketing.py ko-KR --variants phone

Output: docs/release_assets/marketing/<locale>/{phone,play_phone,tablet,common}/ + review/contact_<variant>.png.
Nothing is uploaded; `final/` (the store set) is only replaced after the owner approves.
"""
import argparse, html, json, os, random, subprocess, sys, tempfile
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[3]
RA = ROOT / "docs/release_assets"
CAP = RA / "captures"
OUT = RA / "marketing"
FONTS = RA / "fonts"
ICON = ROOT / "mobile/assets/icon/app_icon.png"
BG_ART = ROOT / "assets/source/background_aurora.webp"
HOUSES = ROOT / "public/assets/v2/house"
PROPS = ROOT / "public/assets/v2/prop"
CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"

VARIANTS = {"phone": (1320, 2868), "play_phone": (1080, 1920), "tablet": (2064, 2752)}
CAP_KIND = {"phone": "phone", "play_phone": "phone", "tablet": "tablet"}
STATUS_BAR = {"phone": 0, "tablet": 0}   # captures come from the integration test: Flutter surface only, no status bar

# App palette (dusk diorama): deep indigo text, lavender snow, warm lamp light, cocoa wood.
INK, INK2, CREAM, WARM, WOOD = "#2E2A4F", "#4F4970", "#FBF7EF", "#F4C08A", "#6B4A3A"
TINTS = {  # top, bottom, glow, title, body, eyebrow
    "lavender": ("#F1EEF9", "#D8D0EE", "#FFE1B8", INK, INK2, "#8A6FB8"),
    "cocoa": ("#F8EFE4", "#E9D5C0", "#F6C48E", "#43291F", "#5E4434", "#B0703E"),
    "dusk": ("#ECE4F4", "#CBB9E2", "#F8CBA6", INK, INK2, "#8A6FB8"),
    "night": ("#2C3064", "#191B3C", "#5FE3B0", CREAM, "#D9D4F0", "#9FE8C9"),
    "rose": ("#FAEDEF", "#ECCFDA", "#FFD9AE", "#4A2C3C", "#664556", "#B65A78"),
}

SLOTS = [  # key, background tint, capture per device kind (phone also feeds play_phone), extras
    # cover: the free village sits low in the capture; drop the bottom buttons and use a smaller frame so it shows
    dict(key="01_village", tint="hero", cap={"phone": "01_village", "tablet": "01_village"},
         crop_end={"phone": 2560, "tablet": 2440}, frame_scale=0.86),
    dict(key="02_photo", tint="cocoa", cap={"phone": "02_photo", "tablet": "02_photo"}),
    dict(key="03_claim", tint="dusk", cap={"phone": "03_claim", "tablet": "03_claim"}, stage=True),
    dict(key="04_grow", tint="night", cap={"phone": "04_grow", "tablet": "04_grow"},
         crop_hint=True),   # the sheet stops above the price/button rows: <capture>.json {"crop_bottom": px}
    dict(key="05_home", tint="rose", cap={"phone": "05_home", "tablet": "05_home"}),
]
STAGE_HOUSES = ["gingerbread", "bakery", "tower", "brick", "timber", "aframe", "windmill", "greenhouse", "wood"]

COPY = {
    "ko-KR": {
        "brand": "Snow Village", "tagline": "친구와 함께 짓는 겨울 마을", "lang": "ko",
        "slots": [
            ("친구와 함께 짓는\n겨울 마을", "링크 하나로 초대하면 친구가 집을 한 채씩 지어요"),
            ("성당 광장을 가운데 두고\n동네가 이어져요", "동네마다 아이스링크·산타의 집 같은 랜드마크가 있어요"),
            ("집을 누르면\n친구의 사진 액자가", "사진은 집을 눌렀을 때만 열려요. 공유 카드에는 들어가지 않아요"),
            ("9가지 집,\n문 방향까지 내 마음대로", "닉네임과 한마디, 사진 한 장을 남겨요"),
            ("친구가 많아지면\n동네를 열어 넓혀요", "무료 6채로 시작해 최대 60채까지"),
            ("회원가입 없이\n바로 시작해요", "마을을 만들고 링크만 보내면 끝"),
        ],
    },
    "en-US": {
        "brand": "Snow Village", "tagline": "A winter village with friends", "lang": "en",
        "slots": [
            ("Build a winter village\nwith friends", "Share one link and each friend builds a house"),
            ("A cathedral plaza\nwith lanes around it", "An ice rink, Santa's house and more landmarks"),
            ("Tap a house to see\na friend's photo", "Photos open only when a house is tapped, never on share cards"),
            ("9 house types,\nany door direction", "Add a nickname, a message and one photo"),
            ("Grow the village\nlane by lane", "Free for 6 houses, up to 60"),
            ("No sign-up,\nstart right away", "Create a village and share the link"),
        ],
    },
}
# Display face per script (all SIL OFL 1.1, same faces as Claire's Ranch): ko Jua, ja M PLUS Rounded 1c Bold,
# zh Resource Han Rounded CN Bold, Latin/Cyrillic Nunito ExtraBold. CJK faces are subset to the caption text
# (`--fonts`, originals in $SNOW_FONT_CACHE) so the repo stays small; Nunito is kept whole.
FONT_CACHE = Path(os.environ.get("SNOW_FONT_CACHE", "/tmp/snow-font-src"))
FONT_SOURCES = {"ko": "Jua-Regular.ttf", "ja": "MPLUSRounded1c-Bold.ttf", "zh": "ResourceHanRoundedCN-Bold.ttf"}
LATIN = FONTS / "Nunito[wght].ttf"
BODY = {"ko": '"Apple SD Gothic Neo"', "ja": '"Hiragino Sans"', "zh": '"PingFang SC"', "ru": '"Helvetica Neue"'}
DEFAULT_BODY = '"Avenir Next","Helvetica Neue"'
LOCALES = ["ko-KR", "en-US", "ja-JP", "zh-CN", "es-419", "fr-FR", "de-DE", "pt-BR", "ru-RU", "id"]


def script(lang):
    return lang if lang in ("ko", "ja", "zh") else "latin"


def display_font(lang):
    return FONTS / f"SVDisplay-{lang}.ttf" if script(lang) != "latin" else LATIN


def body_font(lang):
    return BODY.get(lang, DEFAULT_BODY)


def load_copy():
    """Captions: marketing/copy/<locale>.json (all 10 locales); the dict above is the ko/en fallback."""
    out = dict(COPY)
    for loc in LOCALES:
        f = OUT / "copy" / f"{loc}.json"
        if f.exists():
            out[loc] = json.loads(f.read_text())
    return out


def uri(p):
    return Path(p).resolve().as_uri()


def scale(variant):
    W, _ = VARIANTS[variant]
    return {"phone": 1.0, "play_phone": 1080 / 1320, "tablet": 1.32}[variant]


def css(variant, lang):
    W, H = VARIANTS[variant]
    s = scale(variant)
    m = round(96 * s)
    weight = "800" if script(lang) == "latin" else "400"   # CJK faces have one bold weight: asking for more fakes it
    ls = "-1px" if script(lang) != "latin" else "-0.5px"
    wb = {"ko": "keep-all", "ja": "auto-phrase"}.get(lang, "normal")   # ja: break between phrases (Chrome 119+)
    return f"""
@font-face{{font-family:"SVDisplay";src:url("{uri(display_font(lang))}");font-weight:100 900}}
*{{box-sizing:border-box;margin:0;padding:0}}
html,body{{width:{W}px;height:{H}px;overflow:hidden;background:{CREAM}}}
.sheet{{position:relative;width:{W}px;height:{H}px;overflow:hidden;font-family:{body_font(lang)},sans-serif;display:flex;flex-direction:column}}
.bg,.deco{{position:absolute;inset:0}}
.glow{{position:absolute;border-radius:50%}}
.hills{{position:absolute;left:0;right:0;bottom:0;width:100%;height:{round(560*s)}px}}
.fir{{position:absolute;filter:drop-shadow(0 {round(8*s)}px {round(10*s)}px #2E2A4F22)}}
.rule{{position:absolute;inset:{round(30*s)}px;border:{max(2,round(3*s))}px solid #C9A86A;border-radius:{round(40*s)}px;opacity:.55;z-index:5;pointer-events:none}}
.rule::after{{content:"";position:absolute;inset:{round(10*s)}px;border:{max(1,round(1.5*s))}px solid #C9A86A;border-radius:{round(30*s)}px;opacity:.7}}
.copy{{position:relative;z-index:3;padding:{round(150*s)}px {m+round(20*s)}px 0}}
.eyebrow{{display:flex;align-items:center;gap:{round(16*s)}px;font-family:"SVDisplay",sans-serif;font-weight:{weight};font-size:{round(34*s)}px;letter-spacing:{round(2*s)}px;margin-bottom:{round(30*s)}px}}
.eyebrow .num{{display:inline-flex;align-items:center;justify-content:center;width:{round(72*s)}px;height:{round(72*s)}px;border-radius:50%;background:{INK};color:{CREAM};font-size:{round(30*s)}px;letter-spacing:0;box-shadow:0 0 0 {round(6*s)}px #C9A86A66}}
.eyebrow svg{{width:{round(34*s)}px;height:{round(34*s)}px}}
h1{{font-family:"SVDisplay",sans-serif;font-weight:{weight};font-size:{round(122*s)}px;line-height:1.16;letter-spacing:{ls};word-break:{wb};line-break:strict}}
h1 span{{display:block;white-space:nowrap}}
.sub{{margin-top:{round(30*s)}px;font-size:{round(46*s)}px;line-height:1.42;font-weight:600;word-break:{wb};line-break:strict;text-wrap:balance;max-width:{round(1060*s)}px}}
.media{{position:relative;flex:1;z-index:2}}
.frame{{position:absolute;background:linear-gradient(150deg,#80594A,#5A3B2E 55%,#71503F);border-radius:{round(46*s)}px;
  box-shadow:0 {round(34*s)}px {round(80*s)}px #1B1A3A55,0 {round(6*s)}px {round(16*s)}px #1B1A3A40,inset 0 0 0 {max(2,round(3*s))}px #E2C48A99}}
.frame img.cap{{position:absolute;display:block;border-radius:{round(30*s)}px;object-fit:cover;object-position:top}}
.frame{{z-index:2}}
.snowcap{{position:absolute;left:{round(-12*s)}px;right:{round(-12*s)}px;top:{round(-26*s)}px;height:{round(46*s)}px;z-index:3;background:#FFFFFF;
  border-radius:{round(40*s)}px {round(40*s)}px {round(22*s)}px {round(22*s)}px;box-shadow:0 {round(6*s)}px {round(10*s)}px #2E2A4F30,inset 0 {round(-6*s)}px 0 #E6E1F5}}
.snowcap i{{position:absolute;top:40%;background:#FFFFFF;border-radius:0 0 999px 999px;box-shadow:inset 0 {round(-5*s)}px 0 #E6E1F5}}
.frame.inset{{z-index:4;box-shadow:0 {round(26*s)}px {round(60*s)}px #1B1A3A70,0 0 0 {max(4,round(8*s))}px {CREAM},inset 0 0 0 {max(2,round(3*s))}px #E2C48A99}}
.stage{{position:absolute;z-index:1;border-radius:{round(56*s)}px;background:radial-gradient(ellipse at 50% 28%,#FFFFFF 0%,#F2EEFA 55%,#DCD3F0 100%);
  box-shadow:0 {round(30*s)}px {round(70*s)}px #2E2A4F33,inset 0 0 0 {max(2,round(4*s))}px #C9A86A}}
.stage img{{position:absolute;filter:drop-shadow(0 {round(12*s)}px {round(10*s)}px #2E2A4F30)}}
.hero .bgimg{{position:absolute;inset:-60px;background-size:cover;background-position:center 30%;filter:blur(16px) saturate(1.1)}}
.hero .scrim{{position:absolute;inset:0;background:linear-gradient(180deg,#191B3CF2 0%,#23264FD8 28%,#2E2A4F70 58%,#2E2A4F40 100%)}}
.lockup{{display:flex;align-items:center;gap:{round(30*s)}px;margin-bottom:{round(46*s)}px}}
.lockup img{{width:{round(150*s)}px;height:{round(150*s)}px;border-radius:{round(36*s)}px;box-shadow:0 {round(10*s)}px {round(30*s)}px #0007,0 0 0 {round(5*s)}px #C9A86A}}
.lockup .name{{font-family:"SVDisplay",sans-serif;font-weight:{weight};font-size:{round(70*s)}px;line-height:1.05;color:{CREAM}}}
.lockup .tag{{display:block;font-family:{body_font(lang)},sans-serif;font-weight:600;margin-top:{round(12*s)}px;font-size:{round(36*s)}px;color:{WARM}}}
.hero h1,.hero .sub{{color:{CREAM};text-shadow:0 {round(4*s)}px {round(20*s)}px #0007}}
"""


SNOWFLAKE = ('<svg viewBox="0 0 24 24"><g stroke="currentColor" stroke-width="2.2" stroke-linecap="round" fill="none">'
             '<path d="M12 2v20M3.3 7l17.4 10M3.3 17L20.7 7"/><path d="M9.5 3.8L12 6l2.5-2.2M9.5 20.2L12 18l2.5 2.2"/></g></svg>')


def snow_cap(w):
    """A snow cap on the frame's top edge: one rounded white band plus a few drips (CSS, scales with the frame)."""
    rnd = random.Random(w)
    drips = "".join(
        f'<i style="left:{x:.1f}%;width:{rnd.uniform(3.2, 5.5):.1f}%;height:{rnd.uniform(70, 120):.0f}%"></i>'
        for x in (8 + k * 84 / 6 + rnd.uniform(-4, 4) for k in range(7)))
    return f'<div class="snowcap">{drips}</div>'


def hills(color, shade):
    return (f'<svg class="hills" viewBox="0 0 1000 200" preserveAspectRatio="none">'
            f'<path d="M0,96 C140,50 260,80 380,66 C520,50 610,22 760,48 C880,68 940,52 1000,58 L1000,200 L0,200Z" fill="{shade}" opacity=".55"/>'
            f'<path d="M0,132 C160,98 280,124 430,110 C580,96 690,120 830,104 C920,96 970,110 1000,106 L1000,200 L0,200Z" fill="{color}"/></svg>')


def snow_dots(W, H, s, seed, color="#FFFFFF", n=70, top_frac=1.0):
    rnd = random.Random(seed)
    out = []
    for _ in range(n):
        r = rnd.uniform(3, 9) * s
        out.append(f'<circle cx="{rnd.uniform(0, W):.0f}" cy="{rnd.uniform(0, H * top_frac):.0f}" r="{r:.1f}" '
                   f'fill="{color}" opacity="{rnd.uniform(.35, .85):.2f}"/>')
    return f'<svg class="deco" viewBox="0 0 {W} {H}" style="z-index:1">{"".join(out)}</svg>'


CAPTURE_FALLBACK = None   # --preview: use this locale's captures where a locale has none yet (layout check only)


def cap_path(slot, variant, locale):
    kind = CAP_KIND[variant]
    name = slot["cap"].get(kind)
    if name is None:
        return None
    p = CAP / kind / locale / f"{name}.png"
    if not p.exists() and CAPTURE_FALLBACK:
        p = CAP / kind / CAPTURE_FALLBACK / f"{name}.png"
    return p


def frame_html(src, crop, fw, x, y, rot, s, cls="frame"):
    with Image.open(src) as im:
        cw, ch = im.size
    y0, y1 = crop
    b = round(18 * s)
    iw = fw - 2 * b
    ih = round(iw * (y1 - y0) / cw)
    full_h = round(iw * ch / cw)
    off = round(iw * y0 / cw)
    # The capture is shown through a window: the image is scaled to the inner width and shifted up by the crop.
    return (f'<div class="{cls}" style="left:{x}px;top:{y}px;width:{fw}px;height:{ih + 2 * b}px;transform:rotate({rot}deg)">'
            f'{snow_cap(fw) if cls == "frame" else ""}'
            f'<div style="position:absolute;left:{b}px;top:{b}px;width:{iw}px;height:{ih}px;border-radius:{round(30*s)}px;overflow:hidden">'
            f'<img src="{uri(src)}" style="position:absolute;left:0;top:{-off}px;width:{iw}px;height:{full_h}px;display:block"></div></div>')


def slide_html(locale, variant, idx, slot, num=None):
    c = COPY[locale]
    lang = c["lang"]
    title, sub = c["slots"][idx]
    W, H = VARIANTS[variant]
    s = scale(variant)
    kind = CAP_KIND[variant]
    hero = slot["tint"] == "hero"
    flip = idx % 2 == 0
    body = []
    if hero:
        body.append(f'<div class="bgimg" style="background-image:url({uri(BG_ART)})"></div><div class="scrim"></div>')
        body.append(snow_dots(W, H, s, idx, n=90, top_frac=0.5))
        body.append(hills("#F4F1FB", "#B9AEDD"))
        title_c = body_c = CREAM
    else:
        top, bot, glow, title_c, body_c, eb = TINTS[slot["tint"]]
        body.append(f'<div class="bg" style="background:linear-gradient(180deg,{top} 0%,{bot} 100%)"></div>')
        r = round(1700 * s)
        gx = W * (0.85 if flip else 0.15)
        body.append(f'<div class="glow" style="width:{r}px;height:{r}px;left:{round(gx - r / 2)}px;top:{round(-r * 0.42)}px;'
                    f'background:radial-gradient(circle,{glow}BB 0%,{glow}44 38%,{glow}00 68%)"></div>')
        night = slot["tint"] == "night"
        body.append(snow_dots(W, H, s, idx + 10, "#FFFFFF", n=110 if night else 60))
        body.append(hills("#3A3F78" if night else "#FFFFFF", "#5B5FA0" if night else "#C9C0E3"))
    # firs on the hills at the sides (game art)
    fs = round(300 * s)
    body.append(f'<img class="fir" src="{uri(PROPS / "prop_fir_tall.webp")}" style="z-index:1;width:{fs}px;left:{round(-40*s)}px;bottom:{round(120*s)}px">')
    body.append(f'<img class="fir" src="{uri(PROPS / "prop_fir_mid.webp")}" style="z-index:1;width:{round(fs*0.8)}px;right:{round(-20*s)}px;bottom:{round(170*s)}px">')
    body.append('<div class="rule"></div>')

    # caption
    eb_color = WARM if hero else TINTS[slot["tint"]][5]
    copy = ['<section class="copy">']
    if hero:
        copy.append(f'<div class="lockup"><img src="{uri(ICON)}"><div class="name">{html.escape(c["brand"])}'
                    f'<span class="tag">{html.escape(c["tagline"])}</span></div></div>')
    else:
        copy.append(f'<div class="eyebrow" style="color:{eb_color}"><span class="num">{(num or idx + 1):02d}</span>{SNOWFLAKE}'
                    f'<span>{html.escape(c["brand"])}</span></div>')
    copy.append(f'<h1 style="color:{title_c}">' + "".join(f"<span>{html.escape(t)}</span>" for t in title.split("\n")) + "</h1>")
    copy.append(f'<p class="sub" style="color:{body_c}">{html.escape(sub)}</p></section>')
    body.extend(copy)

    # media: computed in Python against a fixed header height so frames can bleed off the bottom
    src = cap_path(slot, variant, locale)
    crop = (STATUS_BAR[kind], slot.get("crop_end", {}).get(kind))
    if slot.get("crop_hint"):
        hint = src.with_suffix(".json")
        if not hint.exists():
            raise SystemExit(f"FAIL: crop hint missing: {hint}")
        crop = (STATUS_BAR[kind], json.loads(hint.read_text())["crop_bottom"])
    with Image.open(src) as im:
        ch = im.size[1]
    crop = (crop[0], crop[1] or ch)
    media = [f'<div class="media">']
    tablet = variant == "tablet"
    rot = (-1.4 if flip else 1.4) * (0.7 if tablet else 1)
    top = round(70 * s)
    if slot.get("stage"):
        sw = W - round(2 * 130 * s)
        sh = round(sw / 4.3 * 1.62)
        sx = round(130 * s)
        media.append(f'<div class="stage" style="left:{sx}px;top:{top}px;width:{sw}px;height:{sh}px">')
        back, front = STAGE_HOUSES[:5], STAGE_HOUSES[5:]
        hw = round(sw / 4.3)
        pad = round(hw * 0.06)
        for row, names in ((0, back), (1, front)):
            for k, name in enumerate(names):
                hx = round(sw / 2 + (k - (len(names) - 1) / 2) * hw * 0.80 - hw / 2)
                hy = pad + row * round(hw * 0.50)
                f = HOUSES / (f"house_{name}_a.webp" if name != "wood" else "house_wood_lit.webp")
                media.append(f'<img src="{uri(f)}" style="left:{hx}px;top:{hy}px;width:{hw}px;z-index:{row + 1}">')
        media.append("</div>")
        fw = round(W * (0.70 if not tablet else 0.52))
        media.append(frame_html(src, crop, fw, round(W - fw - 110 * s) if flip else round(110 * s), top + sh + round(60 * s), rot, s))
    else:
        fw = round(W * (0.80 if variant != "tablet" else 0.70))
        if variant == "play_phone":
            fw = round(W * 0.70)
        fw = round(fw * slot.get("frame_scale", 1.0))
        media.append(frame_html(src, crop, fw, (W - fw) // 2 + round((24 if flip else -24) * s), top, rot, s))
    media.append("</div>")
    body.extend(media)
    cls = "sheet hero" if hero else "sheet"
    return (f'<!doctype html><html lang="{lang}"><head><meta charset="utf-8"><title>{c["brand"]} {idx + 1:02d}</title>'
            f'<style>{css(variant, lang)}</style></head><body><main class="{cls}">{"".join(body)}</main>{FIT_JS}</body></html>')


# Shrink a title that overflows its column (measured after the display font loads).
FIT_JS = """<script>document.fonts.ready.then(function(){
document.querySelectorAll('h1').forEach(function(h){var fs=parseFloat(getComputedStyle(h).fontSize),g=0;
 function over(){var o=false;h.querySelectorAll('span').forEach(function(x){if(x.scrollWidth>h.clientWidth+1)o=true;});return o;}
 while(over()&&fs>40&&g++<200){fs-=2;h.style.fontSize=fs+'px';}});
document.querySelectorAll('.sub').forEach(function(p){var fs=parseFloat(getComputedStyle(p).fontSize),lh=fs*1.42,g=0;
 while(p.getBoundingClientRect().height>lh*2+4&&fs>24&&g++<100){fs-=1;lh=fs*1.42;p.style.fontSize=fs+'px';}});
document.body.dataset.fit='done';});</script>"""


def feature_html(locale):
    c = COPY[locale]
    lang = c["lang"]
    W, H = 1024, 500
    src = cap_path(SLOTS[0], "phone", locale)
    with Image.open(src) as im:
        cw, ch = im.size
    fw, b = 450, 12   # frame starts at x≈528; the text column ends at 500
    iw = fw - 2 * b
    y0, y1 = 1400, 2080  # the free village (tree, houses, fence) in the cover capture
    ih = round(iw * (y1 - y0) / cw)
    weight = "800" if script(lang) == "latin" else "400"
    wb = {"ko": "keep-all", "ja": "auto-phrase"}.get(lang, "normal")   # ja: break between phrases (Chrome 119+)
    return f"""<!doctype html><html lang="{lang}"><head><meta charset="utf-8"><title>feature</title><style>
@font-face{{font-family:"SVDisplay";src:url("{uri(display_font(lang))}");font-weight:100 900}}
*{{margin:0;padding:0;box-sizing:border-box}} html,body{{width:{W}px;height:{H}px;overflow:hidden}}
.s{{position:relative;width:{W}px;height:{H}px;overflow:hidden;font-family:{body_font(lang)},sans-serif}}
.bgimg{{position:absolute;inset:-40px;background:url({uri(BG_ART)}) center 30%/cover;filter:blur(10px) saturate(1.1)}}
.scrim{{position:absolute;inset:0;background:linear-gradient(90deg,#191B3CF0 0%,#23264FD0 40%,#2E2A4F50 75%,#2E2A4F30 100%)}}
.copy{{position:absolute;left:52px;top:0;bottom:0;width:448px;display:flex;flex-direction:column;justify-content:center;color:#FBF7EF}}
.copy img{{width:92px;height:92px;border-radius:22px;box-shadow:0 6px 18px #0007,0 0 0 3px #C9A86A;margin-bottom:22px}}
.name{{font-family:"SVDisplay";font-weight:{weight};font-size:58px;line-height:1.05;white-space:nowrap}}
.tag{{margin-top:14px;font-size:29px;font-weight:600;color:#F4C08A;word-break:{wb};line-break:strict;text-wrap:balance}}
.frame{{position:absolute;right:46px;top:{(H - ih - 2 * b) // 2 + 8}px;width:{fw}px;height:{ih + 2 * b}px;border-radius:30px;transform:rotate(-1.8deg);
 background:linear-gradient(150deg,#80594A,#5A3B2E 55%,#71503F);box-shadow:0 18px 40px #0008,inset 0 0 0 2px #E2C48A99}}
.win{{position:absolute;left:{b}px;top:{b}px;width:{iw}px;height:{ih}px;border-radius:20px;overflow:hidden}}
.win img{{position:absolute;left:0;top:{-round(iw * y0 / cw)}px;width:{iw}px;height:{round(iw * ch / cw)}px}}
.snowcap{{position:absolute;left:-8px;right:-8px;top:-16px;height:30px;background:#fff;border-radius:26px 26px 14px 14px;box-shadow:0 4px 8px #0003,inset 0 -4px 0 #E6E1F5}}.snowcap i{{position:absolute;top:40%;background:#fff;border-radius:0 0 999px 999px;box-shadow:inset 0 -3px 0 #E6E1F5}}
</style></head><body><div class="s"><div class="bgimg"></div><div class="scrim"></div>{snow_dots(W, H, 0.6, 3, n=50)}
<section class="copy"><img src="{uri(ICON)}"><div class="name">{html.escape(c["brand"])}</div><div class="tag">{html.escape(c["tagline"])}</div></section>
<div class="frame">{snow_cap(fw)}<div class="win"><img src="{uri(src)}"></div></div></div></body></html>"""


def render(html_text, html_path, png_path, size):
    html_path.parent.mkdir(parents=True, exist_ok=True)
    png_path.parent.mkdir(parents=True, exist_ok=True)
    html_path.write_text(html_text)
    W, H = size
    for attempt in range(4):  # headless Chrome sometimes exits 2 (profile lock race)
        with tempfile.TemporaryDirectory() as prof:
            cmd = [CHROME, "--headless=new", "--disable-gpu", "--hide-scrollbars", "--no-first-run",
                   "--no-default-browser-check", f"--user-data-dir={prof}", "--force-device-scale-factor=1",
                   "--allow-file-access-from-files", "--virtual-time-budget=5000",
                   f"--window-size={W},{H}", f"--screenshot={png_path}", html_path.resolve().as_uri()]
            try:
                r = subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=180)
            except subprocess.TimeoutExpired:   # a stuck headless Chrome (busy machine): try again
                r = subprocess.CompletedProcess(cmd, -9)
        if r.returncode == 0 and png_path.exists():
            break
        if attempt == 3:
            raise SystemExit(f"FAIL: chrome {r.returncode} for {html_path}")
    with Image.open(png_path) as im:
        rgb = im.convert("RGB")
    if rgb.size != (W, H):
        raise SystemExit(f"FAIL: {png_path} is {rgb.size}, expected {(W, H)}")
    rgb.save(png_path, optimize=True)
    return png_path


def check_glyphs(locales):
    try:
        from fontTools.ttLib import TTFont
    except ImportError:
        print("warn: fontTools missing, glyph check skipped")
        return
    for loc in locales:
        c = COPY[loc]
        cmap = TTFont(display_font(c["lang"])).getBestCmap()
        text = display_text(c)
        missing = sorted({ch for ch in text if not ch.isspace() and ord(ch) not in cmap})
        if missing:
            raise SystemExit(f"FAIL: {loc} display font lacks {''.join(missing)}")


def display_text(c):
    """Every character drawn in the display face: brand, titles, slide numbers (taglines use the body face)."""
    return c["brand"] + "".join(t for t, _ in c["slots"]) + "0123456789"


def build_fonts():
    """Subset each CJK display face to the characters its captions use (all locales of that script)."""
    from fontTools import subset
    for lang, src in FONT_SOURCES.items():
        path = FONT_CACHE / src
        if not path.exists():
            raise SystemExit(f"FAIL: {path} missing (download it, see docs/release_assets/MARKETING.md)")
        chars = set("0123456789 ,.!?·…—-'\"()&:/")
        for c in COPY.values():
            if c["lang"] == lang:
                chars |= set(display_text(c))
        opts = subset.Options()
        opts.layout_features = ["*"]
        opts.name_IDs = ["*"]
        opts.notdef_outline = True
        font = subset.load_font(str(path), opts)
        s = subset.Subsetter(opts)
        s.populate(text="".join(sorted(chars)))
        s.subset(font)
        out = FONTS / f"SVDisplay-{lang}.ttf"
        subset.save_font(font, str(out), opts)
        print("font", out.name, len(chars), "chars", out.stat().st_size // 1024, "KB")


def contact(locales, variant):
    for loc in locales:
        files = sorted((OUT / loc / variant).glob("*.png"))
        if not files:
            continue
        ims = [Image.open(f).convert("RGB") for f in files]
        w = 360
        ims = [i.resize((w, round(i.height * w / i.width))) for i in ims]
        sheet = Image.new("RGB", (w * len(ims) + 10 * (len(ims) + 1), ims[0].height + 20), "white")
        for k, i in enumerate(ims):
            sheet.paste(i, (10 + k * (w + 10), 10))
        (OUT / "review").mkdir(parents=True, exist_ok=True)
        sheet.save(OUT / "review" / f"contact_{loc}_{variant}.jpg", quality=88)


def import_shots(kind, src_dir):
    """mobile/integration_test/store_shots_test.dart output → captures/<kind>/<locale>/ (size-checked)."""
    want = {"phone": (1320, 2868), "tablet": (2064, 2752)}[kind]
    n = 0
    for loc_dir in sorted(Path(src_dir).iterdir()):
        if not loc_dir.is_dir():
            continue
        dst = CAP / kind / loc_dir.name
        dst.mkdir(parents=True, exist_ok=True)
        for f in sorted(loc_dir.iterdir()):
            if f.suffix == ".png":
                with Image.open(f) as im:
                    if im.size != want:
                        raise SystemExit(f"FAIL: {f} is {im.size}, expected {want}")
            if f.suffix in (".png", ".json"):
                (dst / f.name).write_bytes(f.read_bytes())
                n += 1
    print(f"imported {n} files into captures/{kind}/")


ASC_LOCALE = {"ko-KR": "ko", "en-US": "en-US", "ja-JP": "ja", "zh-CN": "zh-Hans", "es-419": "es-MX", "fr-FR": "fr-FR",
              "de-DE": "de-DE", "pt-BR": "pt-BR", "ru-RU": "ru", "id": "id"}


def to_fastlane(locales):
    """Stage the finished images for the upload lanes (no upload here):
    iOS  mobile/ios/fastlane/screenshots/<asc locale>/  ← phone (6.9") + tablet (iPad 13"), deliver picks the device by size
    Play mobile/android/fastlane/metadata/android/<locale>/images/{phoneScreenshots,tenInchScreenshots}/ + featureGraphic + icon"""
    import shutil
    ios_root = ROOT / "mobile/ios/fastlane/screenshots"
    play_root = ROOT / "mobile/android/fastlane/metadata/android"
    for loc in locales:
        src = OUT / loc
        ios = ios_root / ASC_LOCALE[loc]
        play = play_root / loc / "images"
        for d in (ios, play):
            shutil.rmtree(d, ignore_errors=True)
        ios.mkdir(parents=True)
        for kind, prefix in (("phone", "iphone69"), ("tablet", "ipad13")):
            for f in sorted((src / kind).glob("*.png")):
                shutil.copy(f, ios / f"{f.stem}_{prefix}.png")
        for kind, folder in (("play_phone", "phoneScreenshots"), ("tablet", "tenInchScreenshots")):
            (play / folder).mkdir(parents=True)
            for f in sorted((src / kind).glob("*.png")):
                shutil.copy(f, play / folder / f.name)
        shutil.copy(src / "common/feature_graphic_1024x500.png", play / "featureGraphic.png")
        shutil.copy(src / "common/app_icon_512.png", play / "icon.png")
        print("staged", loc, "→", ios.relative_to(ROOT), "and", play.relative_to(ROOT))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("locales", nargs="*", default=LOCALES)
    ap.add_argument("--fonts", action="store_true", help="rebuild the CJK display subsets first")
    ap.add_argument("--preview", metavar="LOCALE", help="borrow this locale's captures where missing (never for the store)")
    ap.add_argument("--variants", nargs="*", default=list(VARIANTS) + ["feature"])
    ap.add_argument("--slots", nargs="*", type=int)
    ap.add_argument("--to-fastlane", action="store_true", help="only stage finished images for the upload lanes")
    ap.add_argument("--import-shots", nargs=2, metavar=("KIND", "DIR"),
                    help="copy integration-test shots (DIR/<locale>/*.png|json) into captures/KIND/ first")
    a = ap.parse_args()
    if a.to_fastlane:
        return to_fastlane(a.locales)
    if a.import_shots:
        import_shots(*a.import_shots)
    global COPY, CAPTURE_FALLBACK
    COPY = load_copy()
    CAPTURE_FALLBACK = a.preview
    missing = [loc for loc in a.locales if loc not in COPY]
    if missing:
        raise SystemExit(f"FAIL: no captions for {missing} (marketing/copy/<locale>.json)")
    if a.fonts:
        build_fonts()
    check_glyphs(a.locales)
    jobs = []
    for loc in a.locales:
        for v in a.variants:
            if v == "feature":
                jobs.append((feature_html(loc), OUT / loc / "html/feature.html",
                             OUT / loc / "common/feature_graphic_1024x500.png", (1024, 500)))
                continue
            if not a.slots:  # full render: drop images left from an older slide list
                for old in (OUT / loc / v).glob("*.png"):
                    old.unlink()
            n = 0
            for idx, slot in enumerate(SLOTS):
                if cap_path(slot, v, loc) is None:
                    continue  # e.g. the plaza close-up exists only on phone
                n += 1
                if a.slots and idx + 1 not in a.slots:
                    continue
                jobs.append((slide_html(loc, v, idx, slot, n), OUT / loc / f"html/{v}_{n:02d}_{slot['key']}.html",
                             OUT / loc / v / f"{n:02d}_{slot['key']}.png", VARIANTS[v]))
    with ThreadPoolExecutor(2) as ex:
        for p in ex.map(lambda j: render(*j), jobs):
            print("ok", p.relative_to(RA))
    for v in a.variants:
        if v != "feature":
            contact(a.locales, v)
    for loc in a.locales:  # icons are unchanged; copy them next to the feature graphic
        for size in (1024, 512):
            dst = OUT / loc / f"common/app_icon_{size}.png"
            if "feature" in a.variants:
                Image.open(ICON).convert("RGB").resize((size, size), Image.LANCZOS).save(dst)


if __name__ == "__main__":
    main()
