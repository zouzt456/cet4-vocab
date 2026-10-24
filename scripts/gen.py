
# -*- coding: utf-8 -*-
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
import csv, json, os
csv.field_size_limit(10**8)
SRC = str(ROOT / "ecdict.csv")
OUT = str(ROOT / "data" / "cet4.json")

rows = []
with open(SRC, encoding='utf-8', newline='') as f:
    for r in csv.DictReader(f):
        tag = (r.get('tag') or '').strip()
        if not tag or 'cet4' not in tag.split():
            continue
        w = (r.get('word') or '').strip()
        if not w:
            continue
        def i(k):
            v = (r.get(k) or '').strip()
            return int(v) if v.isdigit() else 0
        rows.append([
            w,
            (r.get('phonetic') or '').strip(),
            (r.get('translation') or '').replace('\r\n', '\n').strip(),
            (r.get('exchange') or '').strip(),
            i('collins'),
            i('oxford'),
            i('bnc'),
            i('frq'),
            tag,
            (r.get('pos') or '').strip(),
            (r.get('definition') or '').replace('\r\n', '\n').strip(),
        ])

for r in rows:
    for k in (2, 10):
        r[k] = r[k].replace('\\r\\n', '\n').replace('\\n', '\n').strip()

rows.sort(key=lambda x: (x[6] if x[6] > 0 else 10**7, x[0].lower()))
json.dump(rows, open(OUT, 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
js = open(OUT, encoding='utf-8').read()
print('ROWS', len(rows))
print('JSON_BYTES', len(js.encode('utf-8')))
print('FIRST', rows[0][0], '|', rows[0][6], '|', rows[0][2][:40])
print('LAST', rows[-1][0], '|', rows[-1][6])