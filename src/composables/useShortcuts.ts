import { onMounted, onUnmounted } from "vue";
import type { Confirm } from "./useConfirm";
import type { Deck } from "./useDeck";
import type { Sync } from "./useSync";
import type { Theme } from "./useTheme";

export interface ShortcutCtx {
  deck: Deck;
  confirm: Confirm;
  sync: Sync;
  theme: Theme;
  menuOpen: { value: boolean };
  speak: (t: string) => void;
  toggleStar: () => void;
}

export function useShortcuts(ctx: ShortcutCtx) {
  function isTyping(el: Element | null): boolean {
    const t = el && el.tagName;
    return (
      t === "INPUT" || t === "TEXTAREA" || t === "SELECT" || (el as HTMLElement | null)?.isContentEditable === true
    );
  }

  function onKey(e: KeyboardEvent) {
    // 弹层优先：Escape 关最上面那层
    if (e.key === "Escape") {
      if (ctx.confirm.open.value) {
        ctx.confirm.close();
        e.preventDefault();
        return;
      }
      if (ctx.sync.open.value) {
        ctx.sync.close();
        e.preventDefault();
        return;
      }
      if (ctx.menuOpen.value) {
        ctx.menuOpen.value = false;
        e.preventDefault();
        return;
      }
      return;
    }
    if (ctx.deck.view.value !== "card") return;
    if (ctx.confirm.open.value || ctx.sync.open.value) return;
    if (isTyping(document.activeElement)) return;

    const k = e.key;
    if (k === " " || k === "Spacebar") {
      e.preventDefault();
      ctx.deck.go(1);
    } else if (k === "ArrowLeft" || k === "," || k === "<") {
      e.preventDefault();
      ctx.deck.go(-1);
    } else if (k === "ArrowRight" || k === "." || k === ">") {
      e.preventDefault();
      ctx.deck.go(1);
    } else if (k === "s" || k === "S") {
      const w = ctx.deck.cur.value;
      if (w) ctx.speak(String(w[0]));
    } else if (k === "f" || k === "F") {
      ctx.toggleStar();
    } else if (k === "d" || k === "D") {
      ctx.theme.toggle();
    }
  }

  onMounted(() => window.addEventListener("keydown", onKey));
  onUnmounted(() => window.removeEventListener("keydown", onKey));
}
