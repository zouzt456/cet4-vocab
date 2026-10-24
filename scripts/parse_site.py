
# -*- coding: utf-8 -*-
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
import re, json, glob, os
base = str(ROOT)
words = []
for p in range(1, 40):
    h = open(os.path.join(base, "site", "p%d.html" % p), encoding="utf-8").read()
    ws = re.findall(r'href="/learn/words/([^/"]+)/"', h)
    words.append((p, ws))
total = sum(len(w) for _, w in words)
print("pages", len(words), "total", total, "page1", len(words[0][1]))
print("first 12:", words[0][1][:12])
print("last page:", len(words[-1][1]), words[-1][1][-5:])
flat = [w for _, ws in words for w in ws]
print("dup?", len(flat) - len(set(flat)))
json.dump(flat, open(os.path.join(base, "site-order.json"), "w", encoding="utf-8"), ensure_ascii=False)
print("saved", len(flat))