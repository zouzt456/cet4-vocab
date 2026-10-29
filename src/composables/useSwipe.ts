import { nextTick, onUnmounted, type Ref } from "vue";
import { exOf } from "../lib/data";
import { buildAnsDom, buildC2Dom } from "../lib/exampleDom";
import { C, type ExItem, type Word } from "../lib/marks";

export interface SwipeCtx {
  cardsEl: Ref<HTMLElement | null>;
  underEl: Ref<HTMLElement | null>;
  cardEl: Ref<HTMLElement | null>;
  card2El: Ref<HTMLElement | null>;
  isCardView: () => boolean;
  /** 有弹窗（确认框 / 同步面板）时不接管 */
  isBlocked: () => boolean;
  tapMode: () => "swipe" | "btn";
  canGo: (d: number) => boolean;
  go: (d: number) => void;
  wordAtOffset: (d: number) => Word | null;
  card2Visible: () => boolean;
}

const DUR = 190;

/** 手机：左右滑动切词——下一张整张卡从侧边盖上来，原卡不动（对齐 v1.15 v2 覆盖式动画） */
export function useSwipe(ctx: SwipeCtx) {
  let sx = 0;
  let sy = 0;
  let t0 = 0;
  let active = false;
  let dragging = false;
  let dx = 0;
  let underDir = 0;
  let underBuilt = false;
  let underW = 0;
  let animId = 0;
  let bound: HTMLElement | null = null;

  function skip(el: EventTarget | null): boolean {
    let node = el as HTMLElement | null;
    const box = ctx.cardsEl.value;
    while (node && node !== box) {
      const t = node.tagName || "";
      if (t === "INPUT" || t === "TEXTAREA" || t === "SELECT" || t === "BUTTON") return true;
      node = node.parentNode as HTMLElement | null;
    }
    return false;
  }

  function vw(): number {
    const box = ctx.cardsEl.value;
    return underW || (box && box.clientWidth) || window.innerWidth || 420;
  }

  function fitUnder() {
    const under = ctx.underEl.value;
    const c = ctx.cardEl.value;
    const box = ctx.cardsEl.value;
    const wrap = box ? (box.parentNode as HTMLElement | null) : null;
    if (!under || !c || !wrap) return;
    const wr = wrap.getBoundingClientRect();
    const cr = c.getBoundingClientRect();
    if (!cr.width || !cr.height) return;
    let left = cr.left;
    let top = cr.top;
    let right = cr.right;
    let bottom = cr.bottom;
    const c2 = ctx.card2El.value;
    if (ctx.card2Visible() && c2) {
      const r2 = c2.getBoundingClientRect();
      if (r2.width && r2.height) {
        left = Math.min(left, r2.left);
        top = Math.min(top, r2.top);
        right = Math.max(right, r2.right);
        bottom = Math.max(bottom, r2.bottom);
      }
    }
    under.style.left = left - wr.left + "px";
    under.style.top = top - wr.top + "px";
    under.style.width = right - left + "px";
    under.style.height = bottom - top + "px";
    underW = cr.width;
  }

  function rectOf(el: HTMLElement | null): DOMRect | null {
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return r.width && r.height ? r : null;
  }

  function cloneClean(src: HTMLElement | null): HTMLElement | null {
    if (!src || !src.cloneNode) return null;
    const node = src.cloneNode(true) as HTMLElement;
    node.querySelectorAll("[id]").forEach((el) => {
      el.removeAttribute("id");
    });
    node.removeAttribute("id");
    return node;
  }

  function fillWordClone(node: HTMLElement, w: Word, list: ExItem[], leftN: number, narrow: boolean) {
    const wd = node.querySelector(".word");
    const ph = node.querySelector(".ph span");
    const ans = node.querySelector(".ans");
    const st = node.querySelector(".star") as HTMLElement | null;
    const ht = node.querySelector(".hint") as HTMLElement | null;
    if (wd) wd.textContent = String(w[C.w]);
    if (ph) ph.textContent = String(w[C.ph] || "");
    if (ans) ans.replaceWith(buildAnsDom(w, list, leftN, narrow));
    if (st) st.style.display = "none";
    if (ht) ht.style.display = "none";
    node.className = (node.className ? node.className.replace(/\s*pcopy\s*/g, " ") + " " : "") + "pcopy";
  }

  function fillC2Clone(node: HTMLElement, w: Word, list: ExItem[], from: number) {
    const hd = node.querySelector(".hd");
    const ans = node.querySelector(".ans");
    if (hd) hd.textContent = String(w[C.w]) + " · 其余 " + (list.length - from) + " 条例句";
    if (ans) ans.replaceWith(buildC2Dom(w, list, from));
    node.className = (node.className || "").replace(/\s*on\b/g, " ") + " on pcopy";
  }

  function previewCard(d: number) {
    const under = ctx.underEl.value;
    if (!under) return;
    under.innerHTML = "";
    const w = ctx.wordAtOffset(d);
    if (!w) {
      under.setAttribute("data-w", "");
      return;
    }
    under.setAttribute("data-w", String(w[C.w]));
    const list = exOf(w);
    const leftN = list.length > 2 ? 1 : list.length;
    const rest = list.length - leftN;
    const narrow = !!window.innerWidth && window.innerWidth <= 1100;
    const box = ctx.cardsEl.value;
    const duo = !!(box && box.className.indexOf("duo") >= 0);
    const rowLayout = duo && !narrow;
    const stack = document.createElement("div");
    stack.className = "pstack" + (rowLayout ? " prow" : "");
    const rc = rectOf(ctx.cardEl.value);
    const rc2 = rectOf(ctx.card2El.value);
    const c1 = cloneClean(ctx.cardEl.value);
    if (c1) {
      fillWordClone(c1, w, list, leftN, narrow);
      if (rc && rc.height) c1.style.height = rc.height + "px";
      stack.appendChild(c1);
      if (rest > 0 && ctx.card2El.value) {
        const c2 = cloneClean(ctx.card2El.value);
        if (c2) {
          fillC2Clone(c2, w, list, leftN);
          if (rc2 && rc2.height) c2.style.height = rc2.height + "px";
          stack.appendChild(c2);
        }
      }
      under.appendChild(stack);
      return;
    }
    // 兜底：拿不到克隆能力时手搭一张
    const c = document.createElement("div");
    c.className = "pcard";
    const wd2 = document.createElement("div");
    wd2.className = "word";
    wd2.textContent = String(w[C.w]);
    c.appendChild(wd2);
    const ph2 = document.createElement("div");
    ph2.className = "ph";
    ph2.textContent = String(w[C.ph] || "");
    c.appendChild(ph2);
    c.appendChild(buildAnsDom(w, list, leftN, narrow));
    stack.appendChild(c);
    under.appendChild(stack);
  }

  function setUnder(d: number) {
    if (!ctx.underEl.value || (d === underDir && underBuilt)) return;
    underDir = d;
    previewCard(d);
    underBuilt = true;
  }

  function dimSecond(on: boolean) {
    const c2 = ctx.card2El.value;
    if (!c2) return;
    c2.style.transition = "opacity .15s ease";
    c2.style.opacity = on ? "0.4" : "";
  }

  function clearStyles() {
    const under = ctx.underEl.value;
    if (under) {
      under.style.transition = "";
      under.style.transform = "translateX(100%)";
      under.style.opacity = "0";
      under.style.left = "";
      under.style.top = "";
      under.style.width = "";
      under.style.height = "";
      under.innerHTML = "";
      under.setAttribute("data-w", "");
    }
    underDir = 0;
    underBuilt = false;
    underW = 0;
    dimSecond(false);
  }

  function springBack() {
    const my = ++animId;
    const under = ctx.underEl.value;
    const wp = vw();
    if (under) {
      under.style.transition = "transform .2s cubic-bezier(.2,.8,.3,1), opacity .16s ease";
      under.style.transform = "translateX(" + (underDir > 0 ? wp : -wp) + "px)";
      under.style.opacity = "0";
    }
    setTimeout(() => {
      if (my === animId) clearStyles();
    }, 230);
  }

  function slideOut(d: number) {
    const my = ++animId;
    const under = ctx.underEl.value;
    if (under) {
      under.style.transition = "transform " + DUR + "ms ease-out";
      under.style.transform = "translateX(0)";
      under.style.opacity = "1";
    }
    setTimeout(() => {
      if (my !== animId) return;
      ctx.go(d);
      // Vue 的渲染是异步的：等它把新词渲染出来再撤预览层，否则会闪一帧旧词
      nextTick(() => {
        if (my === animId) clearStyles();
      });
    }, DUR);
  }

  function onStart(e: TouchEvent) {
    if (!e.touches || e.touches.length !== 1) return;
    if (skip(e.target)) return;
    sx = e.touches[0].clientX;
    sy = e.touches[0].clientY;
    t0 = Date.now();
    active = true;
    dragging = false;
    dx = 0;
    underDir = 0;
    underBuilt = false;
    animId++;
  }

  function onMove(e: TouchEvent) {
    if (!active) return;
    if (ctx.tapMode() !== "swipe") return;
    if (!ctx.isCardView()) return;
    if (ctx.isBlocked()) return;
    const t = e.touches && e.touches[0];
    if (!t) return;
    const mx = t.clientX - sx;
    const my = t.clientY - sy;
    if (!dragging) {
      if (Math.abs(mx) < 9) return;
      if (Math.abs(mx) < Math.abs(my) * 1.2) return;
      dragging = true;
      fitUnder();
      dimSecond(true);
      setUnder(mx < 0 ? 1 : -1);
      const under = ctx.underEl.value;
      if (under) under.style.transition = "none";
    }
    dx = mx;
    const d = dx < 0 ? 1 : -1;
    const ok = ctx.canGo(d);
    setUnder(d);
    const under = ctx.underEl.value;
    if (!under) return;
    const wp = vw();
    if (!ok) {
      under.style.opacity = "0";
      return;
    }
    under.style.transform = "translateX(" + ((d > 0 ? wp : -wp) + dx) + "px)";
    under.style.opacity = "1";
  }

  function endSlide() {
    if (!active) return;
    active = false;
    const was = dragging;
    const mv = dx;
    dragging = false;
    dx = 0;
    if (!was) {
      clearStyles();
      return;
    }
    const d = mv < 0 ? 1 : -1;
    if (!ctx.isCardView() || ctx.tapMode() !== "swipe" || ctx.isBlocked()) {
      springBack();
      return;
    }
    if (Math.abs(mv) < 56 || !ctx.canGo(d) || Date.now() - t0 > 1400) {
      springBack();
      return;
    }
    slideOut(d);
  }

  function onEnd(e: TouchEvent) {
    const t = e && e.changedTouches && e.changedTouches[0];
    if (t && active) dx = t.clientX - sx;
    endSlide();
  }

  function onCancel() {
    if (active) {
      active = false;
      dragging = false;
      dx = 0;
      springBack();
    }
  }

  function bind() {
    const box = ctx.cardsEl.value;
    if (!box || bound === box) return;
    unbind();
    bound = box;
    box.addEventListener("touchstart", onStart, { passive: true });
    box.addEventListener("touchmove", onMove, { passive: true });
    box.addEventListener("touchend", onEnd, { passive: true });
    box.addEventListener("touchcancel", onCancel, { passive: true });
  }

  function unbind() {
    if (!bound) return;
    bound.removeEventListener("touchstart", onStart);
    bound.removeEventListener("touchmove", onMove);
    bound.removeEventListener("touchend", onEnd);
    bound.removeEventListener("touchcancel", onCancel);
    bound = null;
  }

  onUnmounted(unbind);

  return { bind, unbind, clearStyles };
}
