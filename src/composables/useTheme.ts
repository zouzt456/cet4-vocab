import { ref } from "vue";

const LS_THEME = "cet4-theme-v1";

export function useTheme() {
  const dark = ref(false);

  function applyTheme(d: boolean) {
    dark.value = !!d;
    const root = document.documentElement;
    if (root) root.className = dark.value ? "dark" : "";
    // 安卓 App 里同步状态栏颜色（浏览器里没有这个对象，忽略即可）
    try {
      const bridge = (window as unknown as { AndroidTheme?: { setDark?: (d: boolean) => void } }).AndroidTheme;
      if (bridge && bridge.setDark) bridge.setDark(dark.value);
    } catch {
      /* 忽略 */
    }
  }

  function setTheme(d: boolean) {
    applyTheme(d);
    try {
      localStorage.setItem(LS_THEME, d ? "dark" : "light");
    } catch {
      /* 忽略 */
    }
  }

  function toggle() {
    setTheme(!dark.value);
  }

  function initTheme() {
    let v: string | null = null;
    try {
      v = localStorage.getItem(LS_THEME);
    } catch {
      /* 忽略 */
    }
    if (v === "dark" || v === "light") {
      applyTheme(v === "dark");
      return;
    }
    let sys = false;
    try {
      sys = !!(window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches);
    } catch {
      /* 忽略 */
    }
    applyTheme(sys);
  }

  return { dark, applyTheme, setTheme, toggle, initTheme };
}

export type Theme = ReturnType<typeof useTheme>;
