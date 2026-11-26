"""Build the offline game from the HTML, home/game scripts, and local art/audio."""
from base64 import b64encode
from pathlib import Path
import re

root = Path(__file__).resolve().parent
source = (root / "index.html").read_text(encoding="utf-8")

def inline_script(match):
    javascript = (root / match.group(1)).read_text(encoding="utf-8")
    return "<script>\n" + javascript + "</script>"

def embed(match):
    path = root / match.group(1)
    encoded = b64encode(path.read_bytes()).decode("ascii")
    mime = {".mp3":"audio/mpeg",".wav":"audio/wav"}.get(path.suffix,"image/png")
    return f'"data:{mime};base64,{encoded}"'

source = re.sub(r'<link rel="(?:icon|apple-touch-icon|manifest)"[^>]*>\n?', "", source)
source, scripts = re.subn(r'<script src="(js/[^"?]+\.js)(?:\?[^"]*)?"></script>', inline_script, source)
result, count = re.subn(r'"(assets/(?:home|sprites|audio|blocks)/[^"]+\.(?:png|mp3|wav))"', embed, source)
if scripts < 3 or count < 8:
    raise ValueError(f"Missing game scripts or assets ({scripts} scripts, {count} assets)")
(root / "moonlight-arcade.html").write_text(result, encoding="utf-8", newline="\n")
