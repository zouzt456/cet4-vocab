
# -*- coding: utf-8 -*-
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
import json, os, re, zipfile, collections
base = str(ROOT)
corp = os.path.join(base, "corpus")
rows = json.load(open(os.path.join(base, "data", "cet4.json"), encoding="utf-8"))

def forms(r):
    fs = {r[0].lower()}
    for part in (r[3] or "").split("/"):
        if ":" in part:
            fs.add(part.split(":", 1)[1].strip().lower())
    fs.discard("")
    return {f for f in fs if f}

word_of_form = collections.defaultdict(set)
for r in rows:
    for f in forms(r):
        word_of_form[f].add(r[0])

TOK = re.compile(r"[a-zA-Z][a-zA-Z'’\-]*")

def clean_en(s):
    s = s.replace("’", "'").replace("--", " ").replace(" - ", " ")
    s = re.sub(r"\s+", " ", s).strip()
    return s

def clean_zh(s):
    s = s.replace("--", " ").replace("—", "，")
    s = re.sub(r"\s+", "", s)   # 中文句子里不需要空格
    return s.strip()

CJK = re.compile(r"[\u4e00-\u9fff]")
def ok_pair(en, zh):
    if not (14 <= len(en) <= 165) or not (6 <= len(zh) <= 130): return False
    if not en[-1] in ".!?": return False
    if not CJK.search(zh): return False
    if re.search(r"[A-Za-z]{3,}", zh): return False
    if re.search(r"[<>#@\t]", en): return False
    if len(zh) < 4: return False
    return True

cands = collections.defaultdict(list)
seen = set()

def add(ens, zhs, src):
    kept = 0
    for en, zh in zip(ens, zhs):
        en, zh = clean_en(en), clean_zh(zh)
        if not ok_pair(en, zh): continue
        kept += 1
        key = en.lower()
        if key in seen: continue
        seen.add(key)
        toks = set(t.lower().strip("-") for t in TOK.findall(en))
        for f in toks:
            for w in word_of_form.get(f, ()):
                cands[w].append((en, zh, src))
    return kept

def read_zip(zp):
    z = zipfile.ZipFile(zp)
    en = z.read([n for n in z.namelist() if n.endswith(".en")][0]).decode("utf-8", "ignore").splitlines()
    zh = z.read([n for n in z.namelist() if n.endswith(".zh")][0]).decode("utf-8", "ignore").splitlines()
    return en, zh

for fname, src in [("en-zh-News-Commentary.txt.zip", "news"), ("en-zh-TED2013.txt.zip", "ted"), ("en-zh-QED.txt.zip", "qed")]:
    en, zh = read_zip(os.path.join(corp, fname))
    print(src, "kept", add(en, zh, src), "unique", len(seen))

have = [r[0] for r in rows if cands.get(r[0])]
miss = [r[0] for r in rows if not cands.get(r[0])]
print("with candidates:", len(have), "missing:", len(miss))
print("missing sample:", miss[:60])

def score(item, word):
    en, zh, src = item
    n = len(en.split())
    s = 0
    if en.lower().count(word) == 1: s += 3
    if 6 <= n <= 24: s += 3
    s += {"ted": 3, "news": 2, "qed": 0}[src]
    if zh.endswith(("。", "！", "？")): s += 2
    return s

ex = {}
for r in rows:
    w = r[0]
    lst = sorted(cands.get(w, []), key=lambda it: -score(it, w))
    ex[w] = [[en, zh, src] for en, zh, src in lst[:3]]

print("total examples:", sum(len(v) for v in ex.values()))
print("words with 3:", sum(1 for v in ex.values() if len(v) == 3), "/", len(rows))
json.dump(ex, open(os.path.join(base, "data", "examples.json"), "w", encoding="utf-8"), ensure_ascii=False)
json.dump(miss, open(os.path.join(base, "missing.json"), "w", encoding="utf-8"), ensure_ascii=False)
print("bytes", os.path.getsize(os.path.join(base, "data", "examples.json")))
for w in ("state", "however", "x-ray", "eagle"):
    print("\n##", w)
    for e in ex.get(w, [])[:2]:
        print(" EN:", e[0]); print(" ZH:", e[1], "|", e[2])