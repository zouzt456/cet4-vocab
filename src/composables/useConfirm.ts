import { ref } from "vue";

export function useConfirm() {
  const open = ref(false);
  const title = ref("确认");
  const msg = ref("");
  const yesText = ref("确定");
  let fn: (() => void) | null = null;

  function ask(t: string, m: string, yes = "确定", cb?: () => void) {
    title.value = t;
    msg.value = m;
    yesText.value = yes || "确定";
    fn = cb || null;
    open.value = true;
  }

  function close() {
    open.value = false;
    fn = null;
  }

  function yes() {
    const f = fn;
    close();
    if (f) f();
  }

  return { open, title, msg, yesText, ask, close, yes };
}

export type Confirm = ReturnType<typeof useConfirm>;
