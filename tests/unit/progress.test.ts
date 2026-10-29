import { beforeEach, describe, expect, it } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { useProgressStore } from "../../src/stores/progress";
import { DATA } from "../../src/lib/data";
import { keyOf } from "../../src/lib/marks";

function fresh() {
  setActivePinia(createPinia());
  const store = useProgressStore();
  store.load();
  return store;
}

describe("进度与生词本", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("词库规模与 v1 一致（3849 条）", () => {
    expect(DATA.length).toBe(3849);
  });

  it("沿用 v1 的 localStorage 键，旧进度直接可读", () => {
    localStorage.setItem("cet4-pos-v1", JSON.stringify({ order: "bnc", mode: "all", i: 1005, s: 0 }));
    localStorage.setItem("cet4-stars-v1", JSON.stringify({ state: 1, might: 1 }));
    const store = fresh();
    expect(store.i).toBe(1005);
    expect(store.starCount).toBe(2);
    expect(store.stars.state).toBe(1);
  });

  it("导出 schema 与 v1 相同（app / schema / stats / data）", () => {
    const store = fresh();
    store.stars[keyOf(DATA[0])] = 1;
    const st = store.collectState();
    expect(st.app).toBe("cet4-vocab");
    expect(st.schema).toBe(1);
    expect(st.stats.words).toBe(3849);
    expect(st.stats.stars).toBe(1);
    expect(st.data.pos).toEqual({ order: "bnc", mode: "all", i: 0, s: 0 });
    expect(Object.keys(st.data.stars)).toEqual([keyOf(DATA[0])]);
  });

  it("导入：接受 v1 导出的老格式，覆盖位置与生词本", () => {
    const store = fresh();
    const r = store.applyState({
      app: "cet4-vocab",
      schema: 1,
      stats: { words: 3849, stars: 2, order: "bnc", mode: "all" },
      data: { pos: { order: "bnc", mode: "all", i: 1005, s: 0 }, stars: { state: 1, might: 1 } },
    });
    expect(r.stars).toBe(2);
    expect(r.pos).toBe(1005);
    expect(store.starCount).toBe(2);
    expect(JSON.parse(localStorage.getItem("cet4-pos-v1") || "{}").i).toBe(1005);
  });

  it("导入：缺 app 段 / 生词本对不上 时报错文案与 v1 一致", () => {
    const store = fresh();
    expect(() => store.applyState({ data: { stars: {} } })).toThrow("不是本应用的同步数据（缺少 app=cet4-vocab）");
    expect(() => store.applyState({ app: "cet4-vocab", data: { stars: { zzzznotaword: 1 } } })).toThrow(
      "生词本里的词和本词表对不上（1 个都不认识）",
    );
  });

  it("导入后可撤销，回到导入前的进度", () => {
    const store = fresh();
    store.i = 7;
    store.stars.state = 1;
    store.persistPos();
    store.persistStars();
    store.applyState({ app: "cet4-vocab", data: { pos: { order: "alpha", mode: "all", i: 3, s: 0 }, stars: {} } });
    expect(store.starCount).toBe(0);
    expect(store.undoImport()).toBe(true);
    expect(store.starCount).toBe(1);
    expect(store.i).toBe(7);
  });

  it("切词方式存 v1 的 cet4-tap-v1，btn 与 swipe 互斥", () => {
    const store = fresh();
    expect(store.tapMode).toBe("swipe");
    store.setTapMode("btn");
    expect(localStorage.getItem("cet4-tap-v1")).toBe("btn");
    expect(fresh().tapMode).toBe("btn");
  });
});
