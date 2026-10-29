// 词条与例句的纯函数工具（从 v1 单文件迁移，逻辑逐行对齐，避免行为漂移）
export type Word = (string | number)[];
export type ExItem = [string, string, string];

/** DATA 行的字段下标（与 scripts/gen.py 输出顺序一致） */
export const C = { w: 0, ph: 1, tr: 2, ex: 3, col: 4, ox: 5, bnc: 6, frq: 7, tag: 8, pos: 9, def: 10 } as const;

export const SRC: Record<string, string> = {
  ted: "TED 演讲",
  news: "News Commentary 新闻评论",
  qed: "QED 字幕语料",
  wm: "WikiMatrix 维基例句",
};

export function esc(s: unknown): string {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function escRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function keyOf(w: Word): string {
  return String(w[C.w] || "").toLowerCase();
}

/** 词形集合：原词 + exchange 变形 + 常见拼写变体（英/美拼写、词尾变化） */
export function formsOf(w: Word): string[] {
  const out: Record<string, 1> = {};
  const base = keyOf(w);
  if (base) out[base] = 1;
  const parts = String(w[C.ex] || "").split("/");
  for (let i = 0; i < parts.length; i++) {
    const p = parts[i].split(":");
    const v = (p.length > 1 ? p[1] : p[0] || "").trim().toLowerCase();
    if (!v || !/^[a-z'’-]+$/.test(v)) continue;
    out[v] = 1;
    if (v.slice(-3) === "ies") out[v.slice(0, -3) + "y"] = 1;
    if (v.slice(-2) === "es") out[v.slice(0, -1)] = 1;
  }
  const keys = Object.keys(out);
  for (const k of keys) {
    const vs = [
      k.replace(/our/g, "or"),
      k.replace(/tre$/, "ter"),
      k.replace(/re$/, "er"),
      k.replace(/ce$/, "se"),
      k.replace(/se$/, "ce"),
      k.replace(/ise$/, "ize"),
      k.replace(/ize$/, "ise"),
      k.replace(/yse$/, "yze"),
      k.replace(/ogue$/, "og"),
      k.replace(/ll([aeiou])/g, "l$1"),
      k.replace(/ae/g, "e"),
      k.replace(/oe/g, "e"),
      k.replace(/tre(s?)$/, "ter$1"),
      k.replace(/mme$/, "m"),
      k.indexOf("-") >= 0 ? k.replace(/-/g, " ") : "",
      k.indexOf("-") >= 0 ? k.replace(/-/g, "") : "",
    ];
    for (const v of vs) {
      if (v && v !== k && /^[a-z'’ -]+$/.test(v)) out[v] = 1;
    }
  }
  const hyph = String(w[C.w] || "").replace(/ /g, "-");
  if (hyph !== base) out[hyph] = 1;
  return Object.keys(out);
}

const ZH_STOP: Record<string, 1> = {
  的: 1,
  了: 1,
  地: 1,
  得: 1,
  着: 1,
  和: 1,
  与: 1,
  在: 1,
  是: 1,
  就: 1,
  也: 1,
  都: 1,
  很: 1,
  不: 1,
  把: 1,
  被: 1,
  给: 1,
  让: 1,
  会: 1,
  能: 1,
  要: 1,
  可: 1,
  以: 1,
  而: 1,
  且: 1,
  或: 1,
  等: 1,
  一: 1,
  些: 1,
  上: 1,
  下: 1,
  里: 1,
  中: 1,
  外: 1,
  人: 1,
  大: 1,
  小: 1,
  多: 1,
  少: 1,
  好: 1,
  老: 1,
  个: 1,
  这: 1,
  那: 1,
  他: 1,
  她: 1,
  它: 1,
};

/** 中文释义切出的可高亮词块（长词优先） */
export function glossesOf(w: Word): string[] {
  const t = String(w[C.tr] || "").replace(/\[[^\]]*\]/g, "\n");
  const runs = t.match(/[\u4e00-\u9fff]+/g) || [];
  const out: Record<string, 1> = {};
  const add = (g: string) => {
    if (!g) return;
    if (g.length >= 2) {
      out[g] = 1;
      const core = g.replace(/[的地得了着过]+$/, "");
      if (core !== g && core.length >= 2) out[core] = 1;
      for (let k = 0; g.length >= 3 && k + 2 <= g.length; k++) {
        const b = g.slice(k, k + 2);
        if (!/[的地得了着过吗呢吧啊]/.test(b)) out[b] = 1;
      }
    } else if (!ZH_STOP[g]) out[g] = 1;
  };
  for (const r of runs) add(r);
  return Object.keys(out).sort((a, b) => b.length - a.length);
}

export function markEn(text: string, forms: string[]): string {
  if (!forms.length) return text;
  const re = new RegExp("(^|[^A-Za-z])(" + forms.map(escRe).join("|") + ")(?=[^A-Za-z]|$)", "gi");
  return text.replace(re, (_m, p1: string, p2: string) => p1 + "<mark>" + p2 + "</mark>");
}

export function markZh(text: string, glosses: string[]): string {
  if (!glosses.length) return text;
  const re = new RegExp("(" + glosses.map(escRe).join("|") + ")", "g");
  return text.replace(re, (m) => "<mark>" + m + "</mark>");
}

export function srcLabel(code: string): string {
  return SRC[code] || code || "";
}

/** 例句区标题（真实卡与滑动预览卡共用同一文案规则） */
export function egHeadText(all: number, narrow: boolean): string {
  return (
    "真实例句 · 中英对照（" +
    all +
    "）" +
    (all > 2 ? "　·　其余 " + (all - 1) + " 条在" + (narrow ? "下方" : "右卡") : "")
  );
}
