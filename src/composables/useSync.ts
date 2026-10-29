import { ref } from "vue";
import type { ProgressStore } from "../stores/progress";

/** 导入时先洗掉 BOM、全角引号，再截出最外层的大括号（对齐 v1 cleanJson） */
export function cleanJson(txt: string): string {
  let s = String(txt || "")
    .replace(/^\uFEFF/, "")
    .trim();
  s = s.replace(/[\u201C\u201D\uFF02]/g, '"').replace(/[\u2018\u2019\uFF07]/g, "'");
  const a = s.indexOf("{");
  const b = s.lastIndexOf("}");
  if (a >= 0 && b > a) s = s.slice(a, b + 1);
  return s;
}

export function useSync(store: ProgressStore, onApplied: () => void) {
  const open = ref(false);
  const txt = ref("");
  const msg = ref("");
  const msgErr = ref(false);
  const backupAvail = ref(false);
  // 安卓 WebView 里下载/选文件都不弹，按钮直接隐藏，免得点了没反应
  const isAndroid = typeof window !== "undefined" && !!(window as unknown as { AndroidTheme?: unknown }).AndroidTheme;

  function setMsg(t: string, err = false) {
    msg.value = t || "";
    msgErr.value = !!err;
  }

  function openSync() {
    backupAvail.value = store.hasBackup();
    txt.value = store.stateText();
    open.value = true;
    setMsg("已生成当前进度（生词本 " + store.starCount + " 个）。复制到另一台粘进去点「导入」即可。");
    // 对齐 v1：打开后自动聚焦并全选，方便直接 Ctrl+C
    setTimeout(() => {
      const el = document.querySelector("#syncTxt") as HTMLTextAreaElement | null;
      if (!el) return;
      try {
        el.focus();
        el.select();
        el.scrollTop = 0;
      } catch {
        /* 忽略 */
      }
    }, 30);
  }

  function close() {
    open.value = false;
  }

  function refresh() {
    txt.value = store.stateText();
    setMsg("已生成，点「复制」或「下载 .json」带走");
  }

  async function copy() {
    const t = txt.value || store.stateText();
    txt.value = t;
    const done = () => setMsg("已复制到剪贴板");
    const fallback = () => {
      try {
        const el = document.querySelector("#syncTxt") as HTMLTextAreaElement | null;
        if (el) {
          el.select();
          document.execCommand("copy");
        }
        done();
      } catch {
        setMsg("复制失败：请长按文本框手动全选复制", true);
      }
    };
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(t).then(done, fallback);
      else fallback();
    } catch {
      fallback();
    }
  }

  function download() {
    const t = txt.value || store.stateText();
    const name = "四级词汇-同步-" + new Date().toISOString().slice(0, 10) + ".json";
    try {
      const blob = new Blob([t], { type: "application/json" });
      const url = (window.URL || URL).createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = name;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        try {
          (window.URL || URL).revokeObjectURL(url);
          if (a.parentNode) a.parentNode.removeChild(a);
        } catch {
          /* 忽略 */
        }
      }, 500);
      setMsg("已下载 " + name);
    } catch {
      setMsg("这个环境不能下载文件，请改用「复制」把文本带走", true);
    }
  }

  function readFile(f: File | null | undefined) {
    if (!f) return;
    try {
      const rd = new FileReader();
      rd.onload = () => {
        txt.value = String(rd.result || "");
        setMsg("已读入文件，点「导入」应用到这台设备");
      };
      rd.onerror = () => setMsg("读取文件失败", true);
      rd.readAsText(f);
    } catch {
      setMsg("读取文件失败，请手动粘贴", true);
    }
  }

  function applyImport() {
    const raw = String(txt.value || "").trim();
    if (!raw) {
      setMsg("先把要导入的内容粘到上面的框（或点「选择文件」）", true);
      return;
    }
    let o: unknown;
    try {
      o = JSON.parse(cleanJson(raw));
    } catch {
      setMsg("内容不是有效的 JSON：检查是否复制完整，或引号被输入法改成了全角", true);
      return;
    }
    let n = 0;
    try {
      const d = (o as { data?: { stars?: Record<string, unknown> } }).data;
      n = Object.keys((d && d.stars) || {}).length;
    } catch {
      n = 0;
    }
    const mine = store.starCount;
    const ask =
      "导入会覆盖这台设备的进度：生词本 " +
      mine +
      " 个 → " +
      n +
      " 个，背单词位置也会一起换。\n\n确定导入吗？（导入后还能点「撤销上次导入」还原）";
    // 安卓 WebView 没配 WebChromeClient，confirm 根本不会弹（默认当作取消），所以只在桌面/浏览器里问
    if (!isAndroid && typeof window.confirm === "function" && !window.confirm(ask)) {
      setMsg("已取消，数据没动");
      return;
    }
    try {
      const r = store.applyState(o);
      backupAvail.value = store.hasBackup();
      onApplied();
      setMsg(
        "已导入：生词本 " +
          r.stars +
          " 个，" +
          (r.mode === "star" ? "只背生词" : "全部单词") +
          "模式停在第 " +
          (r.pos + 1) +
          " 张",
      );
    } catch (err) {
      setMsg("导入失败：" + (err instanceof Error ? err.message : String(err)), true);
    }
  }

  function undo() {
    try {
      if (!store.undoImport()) {
        setMsg("没有可撤销的导入记录", true);
      } else {
        onApplied();
        setMsg("已撤销上一次导入，回到导入前的进度");
      }
    } catch (err) {
      setMsg("撤销失败：" + (err instanceof Error ? err.message : String(err)), true);
    }
    backupAvail.value = store.hasBackup();
  }

  return {
    open,
    txt,
    msg,
    msgErr,
    backupAvail,
    isAndroid,
    openSync,
    close,
    refresh,
    copy,
    download,
    readFile,
    applyImport,
    undo,
  };
}

export type Sync = ReturnType<typeof useSync>;
