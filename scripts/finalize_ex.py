
# -*- coding: utf-8 -*-
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
import json, os, re, zipfile, collections
base = str(ROOT)
corp = os.path.join(base, "corpus")
rows = json.load(open(os.path.join(base, "data", "cet4.json"), encoding="utf-8"))
ex = json.load(open(os.path.join(base, "data", "examples.json"), encoding="utf-8"))
CJK = re.compile(r"[\u4e00-\u9fff]")

# 1) 别名补齐
def read_pairs(fname):
    z = zipfile.ZipFile(os.path.join(corp, fname))
    n = z.namelist()
    a = z.read([x for x in n if x.endswith(".en")][0]).decode("utf-8","ignore").splitlines()
    b = z.read([x for x in n if x.endswith(".zh")][0]).decode("utf-8","ignore").splitlines()
    return a, b

ALIAS = {"ice-cream": "ice cream", "living-room": "living room", "outskirt": "outskirts",
         "reservior": "reservoir", "systematical": "systematic", "uptodate": "up to date"}
targets = {w: ALIAS[w] for w in ALIAS if not ex.get(w)}
print("alias targets", list(targets))
if targets:
    found = collections.defaultdict(list)
    for fname, src in [("en-zh-TED2013.txt.zip","ted"), ("en-zh-News-Commentary.txt.zip","news")]:
        a, b = read_pairs(fname)
        for x, y in zip(a, b):
            xl = re.sub(r"\s+", " ", x).strip()
            yl = re.sub(r"\s+", "", y).strip()
            if not (10 <= len(xl) <= 150): continue
            if not CJK.search(yl) or re.search(r"[A-Za-z]{3,}", yl): continue
            low = xl.lower()
            for w, al in targets.items():
                if len(found[w]) < 2 and re.search(r"(?<![a-z])" + re.escape(al) + r"(?![a-z])", low):
                    found[w].append([xl, yl, src])
    for w, lst in found.items():
        if lst: ex[w] = lst
    print("alias recovered", len(found), "still", [w for w in targets if not ex.get(w)])

# 2) 繁体/错配过滤
TRAD = set("這們個會時說對為來國學開發現產業東車長門風電話頭實際認識講題點麼過還種樣應該經濟運動與從無當聽語讀寫僅讓給與願")
def bad_zh(z):
    return any(ch in TRAD for ch in z)

def glosses(r):
    t = (r[2] or "").replace("\\n", "\n")
    out = set()
    for seg in re.split(r"[\n,，;；、/\.\(\)（）\[\]]+", t):
        seg = re.sub(r"^[a-zA-Z]{1,5}\.\s*", "", seg.strip())
        for m in re.findall(r"[\u4e00-\u9fff]{1,6}", seg):
            out.add(m)
    return {g for g in out if g}

finally_ex = {}
mismatch_dropped = 0
for r in rows:
    w = r[0]
    lst = ex.get(w, [])
    g = glosses(r)
    keep, alt = [], []
    for item in lst:
        en_s, zh_s = item[0], item[1]
        nw = len(en_s.split()); nz = len(CJK.findall(zh_s))
        ratio = nz / max(nw, 1)
        aligned = any(gg in zh_s for gg in g)
        trad = bad_zh(zh_s)
        if trad:
            mismatch_dropped += 1
            continue
        if 0.55 <= ratio <= 3.2 and aligned:
            keep.append(item)
        else:
            alt.append(item)
            mismatch_dropped += 1
    if not keep: keep = alt
    finally_ex[w] = keep[:3]

print("mismatch dropped", mismatch_dropped)
print("words with ex:", sum(1 for v in finally_ex.values() if v), "/", len(rows))
print("empty:", [w for w, v in finally_ex.items() if not v])
print("total examples", sum(len(v) for v in finally_ex.values()))
print("avg per word", round(sum(len(v) for v in finally_ex.values())/len(rows), 2))
json.dump(finally_ex, open(os.path.join(base, "data", "examples.json"), "w", encoding="utf-8"), ensure_ascii=False)
print("bytes", os.path.getsize(os.path.join(base, "data", "examples.json")))
for w in ("state", "government", "cabbage", "omit", "judgement"):
    print("\n##", w)
    for e in finally_ex.get(w, [])[:2]:
        print(" EN:", e[0]); print(" ZH:", e[1], "|", e[2])