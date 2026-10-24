# -*- coding: utf-8 -*-
"""把模板与数据拼成单文件 HTML：python scripts/build.py"""
from pathlib import Path
import json, os

ROOT = Path(__file__).resolve().parents[1]
tpl = (ROOT / "src" / "template.html").read_text(encoding="utf-8")
data = (ROOT / "data" / "cet4.json").read_text(encoding="utf-8")
ex = json.loads((ROOT / "data" / "examples.json").read_text(encoding="utf-8"))

assert "__DATA__" in tpl and "__EX__" in tpl, "模板占位符缺失"
json.loads(data)
exs = json.dumps(ex, ensure_ascii=False, separators=(",", ":"))
html = tpl.replace("__DATA__", data).replace("__EX__", exs)

out = ROOT / "dist" / "四级词汇.html"
out.parent.mkdir(exist_ok=True)
out.write_text(html, encoding="utf-8", newline="\n")
print("OUT", out)
print("BYTES", os.path.getsize(out))
print("ROWS", len(json.loads(data)), "EXWORDS", len(ex), "EXS", sum(len(v) for v in ex.values()))
