import { exOf } from "./data";
import { C, egHeadText, esc, formsOf, glossesOf, markEn, markZh, srcLabel, type ExItem, type Word } from "./marks";

/** 例句节点（与 v1 egNode 完全一致：en / zh / src 三段） */
export function egNode(w: Word, it: ExItem, fs: string[], gs: string[]): HTMLElement {
  const eg = document.createElement("div");
  eg.className = "eg";
  const en = document.createElement("div");
  en.className = "en";
  en.innerHTML = markEn(esc(it[0]), fs);
  const zh = document.createElement("div");
  zh.className = "zh";
  zh.innerHTML = markZh(esc(it[1]), gs);
  const sr = document.createElement("span");
  sr.className = "src";
  sr.textContent = "— " + srcLabel(it[2]);
  eg.appendChild(en);
  eg.appendChild(zh);
  eg.appendChild(sr);
  return eg;
}

/** 例句块（标题可选，真实卡与滑动预览克隆共用） */
export function egWrap(w: Word, list: ExItem[], from: number, to: number, hdText = ""): HTMLElement {
  const wrap = document.createElement("div");
  wrap.className = "egs";
  if (hdText) {
    const hd = document.createElement("div");
    hd.className = "hd";
    hd.textContent = hdText;
    wrap.appendChild(hd);
  }
  const fs = formsOf(w);
  const gs = glossesOf(w);
  const egl = document.createElement("div");
  egl.className = "eglist";
  for (let i = from; i < to; i++) egl.appendChild(egNode(w, list[i], fs, gs));
  wrap.appendChild(egl);
  return wrap;
}

/** 释义 + 左卡例句（v1 paintAns） */
export function buildAnsDom(w: Word, list: ExItem[], leftN: number, narrow: boolean): HTMLElement {
  const ans = document.createElement("div");
  ans.className = "ans";
  const tr = document.createElement("div");
  tr.textContent = String(w[C.tr] || "");
  ans.appendChild(tr);
  if (list.length) ans.appendChild(egWrap(w, list, 0, leftN, egHeadText(list.length, narrow)));
  return ans;
}

/** 右卡/下卡例句（v1 paintC2） */
export function buildC2Dom(w: Word, list: ExItem[], from: number): HTMLElement {
  const ans = document.createElement("div");
  ans.className = "ans";
  const wrap = document.createElement("div");
  wrap.className = "egs";
  const fs = formsOf(w);
  const gs = glossesOf(w);
  const egl = document.createElement("div");
  egl.className = "eglist";
  for (let i = from; i < list.length; i++) egl.appendChild(egNode(w, list[i], fs, gs));
  wrap.appendChild(egl);
  ans.appendChild(wrap);
  return ans;
}

/* ---- 下面是给 Vue 的 v-html 用的字符串版本：排版与上面 DOM 版完全一致 ---- */

/** 单条例句 HTML */
export function itHtml(w: Word, it: ExItem): string {
  const fs = formsOf(w);
  const gs = glossesOf(w);
  return (
    '<div class="eg"><div class="en">' +
    markEn(esc(it[0]), fs) +
    '</div><div class="zh">' +
    markZh(esc(it[1]), gs) +
    '</div><span class="src">— ' +
    esc(srcLabel(it[2])) +
    "</span></div>"
  );
}

/** 卡片里的释义 + 例句区（v1 paintAns 的 HTML 版） */
export function ansHtml(w: Word, list: ExItem[], leftN: number, narrow: boolean): string {
  const tr = "<div>" + esc(w[C.tr]) + "</div>";
  if (!list.length) return tr;
  let h = '<div class="egs"><div class="hd">' + esc(egHeadText(list.length, narrow)) + '</div><div class="eglist">';
  for (let i = 0; i < leftN; i++) h += itHtml(w, list[i]);
  return tr + h + "</div></div>";
}

/** 右卡例句区（v1 paintC2 的 HTML 版） */
export function c2Html(w: Word, list: ExItem[], from: number): string {
  let h = '<div class="egs"><div class="eglist">';
  for (let i = from; i < list.length; i++) h += itHtml(w, list[i]);
  return h + "</div></div>";
}

/** 词表 / 生词本行展开后的例句（v1 rowEgsHtml） */
export function rowEgsHtml(w: Word): string {
  const list = exOf(w);
  if (!list.length) return '<div class="egs"><div class="eg emptyEg">这个词暂无例句</div></div>';
  let h = '<div class="egs">';
  for (let i = 0; i < list.length; i++) h += itHtml(w, list[i]);
  return h + "</div>";
}
