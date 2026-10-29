<script setup lang="ts">
import { onMounted, onUnmounted, ref } from "vue";
import ConfirmDialog from "./components/ConfirmDialog.vue";
import MenuBar from "./components/MenuBar.vue";
import StarList from "./components/StarList.vue";
import SyncDialog from "./components/SyncDialog.vue";
import WordCard from "./components/WordCard.vue";
import WordList from "./components/WordList.vue";
import { useConfirm } from "./composables/useConfirm";
import { useDeck } from "./composables/useDeck";
import { useShortcuts } from "./composables/useShortcuts";
import { useSpeech } from "./composables/useSpeech";
import { useSync } from "./composables/useSync";
import { useTheme } from "./composables/useTheme";
import type { AppCtx } from "./lib/ctx";
import { DATA } from "./lib/data";
import { useProgressStore } from "./stores/progress";

const store = useProgressStore();
store.load();
const deck = useDeck(store);
const theme = useTheme();
theme.initTheme();
const confirm = useConfirm();
const speech = useSpeech();
const menuOpen = ref(false);
const sync = useSync(store, () => deck.init());

deck.init();

function activate(v: "card" | "list" | "stars") {
  deck.view.value = v;
  menuOpen.value = false;
}

function toggleStar() {
  const w = deck.cur.value;
  if (!w) return;
  store.toggleStar(w);
  deck.refreshMode();
}

function clearStars() {
  menuOpen.value = false;
  const n = store.starCount;
  if (!n) {
    confirm.ask("生词本已经是空的", "还没有收藏过单词，看到想记的点卡片右上角的 ☆ 就行。", "知道了");
    return;
  }
  confirm.ask("清空生词本？", "会移除全部 " + n + " 个收藏词，背单词进度不受影响，但清空后不能撤销。", "清空", () => {
    store.clearStars();
    deck.init();
  });
}

function goFirst() {
  menuOpen.value = false;
  if (!deck.total.value) {
    confirm.ask("回到第一个词？", "现在没有可背的词，先去生词本加几个吧。", "知道了");
    return;
  }
  const w = deck.cur.value;
  confirm.ask(
    "回到第一个词？",
    "你现在停在第 " +
      (deck.pos.value + 1) +
      " 个词（共 " +
      deck.total.value +
      " 个）" +
      (w ? "，就是 " + String(w[0]) : "") +
      "。回去后要从头翻，生词本和收藏不会动。",
    "回到第一个词",
    () => {
      deck.resetToFirst();
      deck.view.value = "card";
    },
  );
}

const ctx: AppCtx = {
  store,
  deck,
  theme,
  confirm,
  sync,
  speak: speech.speak,
  menuOpen,
  activate,
  toggleStar,
  clearStars,
  goFirst,
};

useShortcuts({ deck, confirm, sync, theme, menuOpen, speak: speech.speak, toggleStar });

function onResize() {
  deck.syncNarrow();
}

onMounted(() => {
  deck.syncNarrow();
  window.addEventListener("resize", onResize);
});
onUnmounted(() => window.removeEventListener("resize", onResize));
</script>

<template>
  <MenuBar :ctx="ctx" />
  <main>
    <section id="v-card" :class="{ on: deck.view.value === 'card' }"><WordCard :ctx="ctx" /></section>
    <section id="v-list" :class="{ on: deck.view.value === 'list' }"><WordList :ctx="ctx" /></section>
    <section id="v-stars" :class="{ on: deck.view.value === 'stars' }"><StarList :ctx="ctx" /></section>
  </main>
  <SyncDialog :ctx="ctx" />
  <ConfirmDialog :ctx="ctx" />
  <footer>
    <span>数据来源：ECDICT（MIT）· 共 <span id="ftotal">{{ DATA.length }}</span> 条四级词条</span>
  </footer>
</template>
