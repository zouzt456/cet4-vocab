import { defineStore } from "pinia";
import { DATA } from "../lib/data";
import { keyOf, type Word } from "../lib/marks";

// 与 v1 完全相同的 localStorage 键：旧进度、旧导出文件无需迁移即可直接用
const LS_POS = "cet4-pos-v1";
const LS_STARS = "cet4-stars-v1";
const LS_TAP = "cet4-tap-v1";
const LS_BAK = "cet4-sync-bak-v1";

export const SYNC_APP = "cet4-vocab";
export const SYNC_SCHEMA = 1;

export type Mode = "all" | "star";
export type Order = "bnc" | "alpha" | "rand";
export type TapMode = "swipe" | "btn";

export interface SyncState {
  app: string;
  schema: number;
  exportedAt: string;
  stats: { words: number; stars: number; order: Order; mode: Mode };
  data: { pos: { order: Order; mode: Mode; i: number; s: number }; stars: Record<string, 1> };
}

let WORDKEYS: Record<string, 1> | null = null;
function isWordKey(k: string): boolean {
  if (!WORDKEYS) {
    WORDKEYS = {};
    for (const w of DATA) WORDKEYS[keyOf(w)] = 1;
  }
  return !!WORDKEYS[String(k || "").toLowerCase()];
}

export const useProgressStore = defineStore("progress", {
  state: () => ({
    order: "bnc" as Order,
    mode: "all" as Mode,
    /** 「全部单词」模式停在第几张 */
    i: 0,
    /** 「只背生词」模式停在第几张 */
    s: 0,
    tapMode: "swipe" as TapMode,
    stars: {} as Record<string, 1>,
    loaded: false,
  }),
  getters: {
    starCount: (state) => Object.keys(state.stars).length,
  },
  actions: {
    load() {
      if (this.loaded) return;
      try {
        const sv = JSON.parse(localStorage.getItem(LS_POS) || "{}");
        if (sv && typeof sv === "object") {
          if (sv.order === "alpha" || sv.order === "rand" || sv.order === "bnc") this.order = sv.order;
          if (sv.mode === "star" || sv.mode === "all") this.mode = sv.mode;
          if (typeof sv.i === "number" && sv.i >= 0) this.i = Math.floor(sv.i);
          if (typeof sv.s === "number" && sv.s >= 0) this.s = Math.floor(sv.s);
        }
      } catch {
        /* 忽略脏数据 */
      }
      try {
        const stv = JSON.parse(localStorage.getItem(LS_STARS) || "{}");
        if (stv && typeof stv === "object") {
          for (const k of Object.keys(stv)) if (stv[k]) this.stars[k] = 1;
        }
      } catch {
        /* 忽略脏数据 */
      }
      try {
        const tv = localStorage.getItem(LS_TAP);
        this.tapMode = tv === "btn" || tv === "tap" ? "btn" : "swipe";
      } catch {
        /* 忽略脏数据 */
      }
      this.loaded = true;
    },
    persistPos() {
      try {
        localStorage.setItem(LS_POS, JSON.stringify({ order: this.order, mode: this.mode, i: this.i, s: this.s }));
      } catch {
        /* 隐私模式等场景忽略 */
      }
    },
    persistStars() {
      try {
        localStorage.setItem(LS_STARS, JSON.stringify(this.stars));
      } catch {
        /* 忽略 */
      }
    },
    setTapMode(t: TapMode) {
      this.tapMode = t;
      try {
        localStorage.setItem(LS_TAP, t);
      } catch {
        /* 忽略 */
      }
    },
    isStar(w: Word | null): boolean {
      return !!w && !!this.stars[keyOf(w)];
    },
    toggleStar(w: Word): boolean {
      const k = keyOf(w);
      if (this.stars[k]) delete this.stars[k];
      else this.stars[k] = 1;
      this.persistStars();
      return !!this.stars[k];
    },
    clearStars() {
      this.stars = {};
      this.persistStars();
    },
    exportedStars(): Record<string, 1> {
      const st: Record<string, 1> = {};
      for (const k of Object.keys(this.stars)) if (this.stars[k]) st[k] = 1;
      return st;
    },
    collectState(): SyncState {
      return {
        app: SYNC_APP,
        schema: SYNC_SCHEMA,
        exportedAt: new Date().toISOString(),
        stats: { words: DATA.length, stars: this.starCount, order: this.order, mode: this.mode },
        data: { pos: { order: this.order, mode: this.mode, i: this.i, s: this.s }, stars: this.exportedStars() },
      };
    },
    stateText(): string {
      return JSON.stringify(this.collectState(), null, 1);
    },
    /** 应用导入数据；抛错时信息直接给用户看（与原版文案一致） */
    applyState(o: unknown): { stars: number; pos: number; mode: Mode } {
      if (!o || typeof o !== "object") throw new Error("内容不是对象");
      const obj = o as Record<string, unknown>;
      if (obj.app !== SYNC_APP) throw new Error("不是本应用的同步数据（缺少 app=cet4-vocab）");
      if (!obj.data || typeof obj.data !== "object") throw new Error("缺少 data 段");
      const d = obj.data as Record<string, unknown>;
      if (!d.stars || typeof d.stars !== "object") throw new Error("缺少生词本数据");
      const src = d.stars as Record<string, unknown>;
      let got = 0;
      const st: Record<string, 1> = {};
      for (const k of Object.keys(src)) {
        if (src[k]) {
          got++;
          if (isWordKey(k)) st[k] = 1;
        }
      }
      if (got && !Object.keys(st).length) throw new Error("生词本里的词和本词表对不上（" + got + " 个都不认识）");
      this.backupBeforeImport();
      this.stars = st;
      const p = (d.pos && typeof d.pos === "object" ? d.pos : {}) as Record<string, unknown>;
      this.order = p.order === "alpha" || p.order === "rand" ? p.order : "bnc";
      this.mode = p.mode === "star" ? "star" : "all";
      this.i = typeof p.i === "number" && p.i >= 0 ? Math.floor(p.i) : 0;
      this.s = typeof p.s === "number" && p.s >= 0 ? Math.floor(p.s) : 0;
      this.persistStars();
      this.persistPos();
      return { stars: Object.keys(this.stars).length, pos: this.mode === "star" ? this.s : this.i, mode: this.mode };
    },
    backupBeforeImport() {
      try {
        localStorage.setItem(
          LS_BAK,
          JSON.stringify({
            at: new Date().toISOString(),
            pos: { order: this.order, mode: this.mode, i: this.i, s: this.s },
            stars: this.exportedStars(),
          }),
        );
      } catch {
        /* 忽略 */
      }
    },
    hasBackup(): boolean {
      try {
        return !!localStorage.getItem(LS_BAK);
      } catch {
        return false;
      }
    },
    undoImport(): boolean {
      let raw: string | null = null;
      try {
        raw = localStorage.getItem(LS_BAK);
      } catch {
        /* 忽略 */
      }
      if (!raw) return false;
      const o = JSON.parse(raw) as { stars?: Record<string, 1>; pos?: Record<string, unknown> };
      this.applyState({ app: SYNC_APP, data: { stars: o.stars || {}, pos: o.pos || {} } });
      try {
        localStorage.removeItem(LS_BAK);
      } catch {
        /* 忽略 */
      }
      return true;
    },
  },
});

export type ProgressStore = ReturnType<typeof useProgressStore>;
