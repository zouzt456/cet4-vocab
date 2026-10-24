
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
import csv, sys, collections
csv.field_size_limit(10**8)
path = str(ROOT / "ecdict.csv")
total = 0
cet4 = 0
tagsets = collections.Counter()
cet4_words = []
with open(path, encoding='utf-8', newline='') as f:
    for row in csv.DictReader(f):
        total += 1
        tag = (row.get('tag') or '').strip()
        if not tag:
            continue
        ts = tag.split()
        if 'cet4' in ts:
            cet4 += 1
            tagsets[' '.join(sorted(ts))] += 1
            cet4_words.append(row)
print('TOTAL', total)
print('CET4', cet4)
print('TOP TAGSETS')
for k, v in tagsets.most_common(10):
    print(' ', repr(k), v)
print('SAMPLE')
for r in cet4_words[:5]:
    print(' |', r['word'], '|', r['phonetic'], '|', r['translation'][:40].replace('\n',' / '), '|', r['tag'], '|', r['collins'], r['oxford'], r['bnc'], r['frq'], '|', r['exchange'][:50])
# size estimate of json payload
import json
keys = ['word','phonetic','definition','translation','pos','collins','oxford','tag','bnc','frq','exchange']
payload = [{k: (r.get(k) or '') for k in keys} for r in cet4_words]
js = json.dumps(payload, ensure_ascii=False, separators=(',',':'))
print('JSON_CHARS', len(js))
print('EMPTY_TRANSLATION', sum(1 for r in cet4_words if not (r.get('translation') or '').strip()))
print('HAS_EXCHANGE', sum(1 for r in cet4_words if (r.get('exchange') or '').strip()))