import { computed, ref } from "vue";
import { DATA } from "../lib/data";
import { keyOf, type Word } from "../lib/marks";
import type { Mode, Order, ProgressStore } from "../stores/progress";

export type View = "card" | "list" | "stars";

export function useDeck(store: ProgressStore) {
  const orderArr = ref<number[]>([]);
  const pos = ref(0);
  const view = ref<View>("card");
  const narrow = ref(false);

  const total = computed(() => orderArr.value.length);
  const cur = computed<Word | null>(() =>
    orderArr.value.length ? ((DATA[orderArr.value[pos.value]] as Word) ?? null) : null,
  );
  const starOn = computed(() => !!cur.value && !!store.stars[keyOf(cur.value)]);
  const hintText = computed(() =>
    store.tapMode === "btn"
      ? "点「上一张 / 下一张」切词　·　空格：下一张　·　s 发音　·　f 收藏　·　d 夜间模式"
      : "空格：下一张　·　‹ › ← →：翻词　·　s 发音　·　f 收藏　·　d 夜间模式　·　手机左右滑动翻词",
  );

  function clamp() {
    if (pos.value < 0) pos.value = 0;
    if (pos.value > orderArr.value.length - 1) pos.value = Math.max(0, orderArr.value.length - 1);
  }

  function buildOrder() {
    const arr: number[] = [];
    for (let i = 0; i < DATA.length; i++) {
      if (store.mode === "star" && !store.stars[keyOf(DATA[i])]) continue;
      arr.push(i);
    }
    if (store.order === "alpha") {
      arr.sort((a, b) => {
        const x = keyOf(DATA[a]);
        const y = keyOf(DATA[b]);
        return x < y ? -1 : x > y ? 1 : 0;
      });
    } else if (store.order === "rand") {
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const t = arr[i];
        arr[i] = arr[j];
        arr[j] = t;
      }
    }
    orderArr.value = arr;
    if (pos.value > arr.length - 1) pos.value = arr.length - 1;
  }

  function slotOf(m: Mode): number {
    return m === "star" ? store.s : store.i;
  }
  function syncSlots() {
    if (store.mode === "star") store.s = pos.value;
    else store.i = pos.value;
  }
  function persist() {
    syncSlots();
    store.persistPos();
  }

  function init() {
    buildOrder();
    pos.value = slotOf(store.mode);
    clamp();
  }

  function go(d: number) {
    const n = pos.value + d;
    if (n < 0 || n >= orderArr.value.length) return;
    pos.value = n;
    persist();
  }

  function keepWord() {
    const key = cur.value ? keyOf(cur.value) : null;
    const fallback = pos.value;
    buildOrder();
    if (key) {
      for (let i = 0; i < orderArr.value.length; i++) {
        if (keyOf(DATA[orderArr.value[i]]) === key) {
          pos.value = i;
          return;
        }
      }
    }
    pos.value =
      fallback > orderArr.value.length - 1 ? Math.max(0, orderArr.value.length - 1) : fallback < 0 ? 0 : fallback;
  }

  function setMode(m: Mode) {
    syncSlots(); // 先把当前模式的位置存进它自己的槽
    store.mode = m;
    buildOrder();
    pos.value = slotOf(m); // 回到该模式上次停的那一张
    clamp();
    persist();
  }

  function setOrder(o: Order) {
    store.order = o;
    keepWord();
    persist();
  }

  /** 生词本变化后（只背生词模式下）重建顺序并夹住位置 */
  function refreshMode() {
    if (store.mode !== "star") return;
    buildOrder();
    clamp();
    persist();
  }

  function resetToFirst() {
    store.i = 0;
    store.s = 0;
    pos.value = 0;
    persist();
  }

  function dataIndexOfQ(q: string): number {
    const key = String(q || "")
      .trim()
      .toLowerCase();
    if (!key) return -1;
    for (let i = 0; i < DATA.length; i++) if (keyOf(DATA[i]) === key) return i;
    let hit = -1;
    let cnt = 0;
    for (let i = 0; i < DATA.length; i++) {
      if (keyOf(DATA[i]).indexOf(key) === 0) {
        if (hit < 0) hit = i;
        cnt++;
      }
    }
    return cnt === 1 ? hit : -1;
  }

  function jumpToWord(di: number): boolean {
    if (di < 0 || di >= DATA.length) return false;
    const w = DATA[di];
    if (store.mode === "star" && !store.stars[keyOf(w)]) {
      store.mode = "all";
    }
    buildOrder();
    let j = orderArr.value.indexOf(di);
    if (j < 0) {
      buildOrder();
      j = orderArr.value.indexOf(di);
    }
    if (j < 0) return false;
    pos.value = j;
    persist();
    view.value = "card";
    return true;
  }

  function syncNarrow() {
    narrow.value = typeof window !== "undefined" && !!window.innerWidth && window.innerWidth <= 1100;
  }

  return {
    orderArr,
    pos,
    view,
    narrow,
    total,
    cur,
    starOn,
    hintText,
    init,
    go,
    setMode,
    setOrder,
    refreshMode,
    resetToFirst,
    jumpToWord,
    dataIndexOfQ,
    persist,
    syncNarrow,
  };
}

export type Deck = ReturnType<typeof useDeck>;
