import type { Ref } from "vue";
import type { Confirm } from "../composables/useConfirm";
import type { Deck } from "../composables/useDeck";
import type { Sync } from "../composables/useSync";
import type { Theme } from "../composables/useTheme";
import type { ProgressStore } from "../stores/progress";

/** App 里建一次，往下传给各组件的运行上下文（避免每个组件各自 new 一套状态） */
export interface AppCtx {
  store: ProgressStore;
  deck: Deck;
  theme: Theme;
  confirm: Confirm;
  sync: Sync;
  speak: (t: string) => void;
  menuOpen: Ref<boolean>;
  activate: (v: "card" | "list" | "stars") => void;
  toggleStar: () => void;
  clearStars: () => void;
  goFirst: () => void;
}
