# -*- coding: utf-8 -*-
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
import os
base = str(ROOT)
html = open(str(ROOT / "dist" / "四级词汇.html"), encoding="utf-8").read()
def variant(name, extra):
    idx = html.rfind("</script>")
    h2 = html[:idx] + "\n" + extra + "\n" + html[idx:]
    open(os.path.join(base, name), "w", encoding="utf-8", newline="\n").write(h2)
    print("WROTE", name)
variant("test-answer.html", "")
variant("test-few.html", "go(1);")
variant("test-collapsed.html", "toggleAns();")
variant("test-stars.html", "document.getElementById('star').click();go(2);document.getElementById('star').click();var t=document.querySelectorAll('nav button');t[2].click();")
variant("test-list.html", "document.getElementById('v-card').className='';document.getElementById('v-list').className='on';document.getElementById('q').value='政';renderList();var r=document.querySelector('#list .row');if(r)r.click();")