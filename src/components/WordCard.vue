<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useSwipe } from "../composables/useSwipe";
import { DATA, exOf } from "../lib/data";
import type { AppCtx } from "../lib/ctx";
import { ansHtml, c2Html } from "../lib/exampleDom";

const props = defineProps<{ ctx: AppCtx }>();
const ctx = props.ctx;

const cardsEl = ref<HTMLElement | null>(null);
const underEl = ref<HTMLElement | null>(null);
const cardEl = ref<HTMLElement | null>(null);
const card2El = ref<HTMLElement | null>(null);
const jumpVal = ref("");
const jumpTip = ref("跳到某个词…");

const w = computed(() => ctx.deck.cur.value);
const list = computed(() => (w.value ? exOf(w.value) : []));
const leftN = computed(() => (list.value.length > 2 ? 1 : list.value.length));
const rest = computed(() => list.value.length - leftN.value);
const total = computed(() => ctx.deck.total.value);
const empty = computed(() => total.value === 0);

const wordText = computed(() => (w.value ? String(w.value[0]) : "—"));
const phon = computed(() => (w.value ? String(w.value[1] || "") : ""));
const ans = computed(() => (w.value ? ansHtml(w.value, list.value, leftN.value, ctx.deck.narrow.value) : ""));
const c2 = computed(() => (w.value && rest.value > 0 ? c2Html(w.value, list.value, leftN.value) : ""));
const c2head = computed(() =>
  w.value && rest.value > 0 ? String(w.value[0]) + " · 其余 " + rest.value + " 条例句" : "",
);
const hint = computed(() =>
  empty.value ? "生词本还是空的：背单词时点右上角 ☆ 或按 f 收藏，再回到这里就能只背生词" : ctx.deck.hintText.value,
);
const pmeta = computed(() => {
  if (empty.value) return "只背生词 · 还没有生词";
  const n = ctx.deck.pos.value + 1;
  const pct = ((n / total.value) * 100).toFixed(2);
  return "进度 " + pct + "%　·　第 " + n + " 词 / 共 " + total.value + " 词";
});
const pfill = computed(() => (empty.value ? "0%" : (((ctx.deck.pos.value + 1) / total.value) * 100).toFixed(2) + "%"));
const cnt = computed(() => (empty.value ? "0 / 0" : ctx.deck.pos.value + 1 + " / " + total.value));
const starOn = computed(() => ctx.deck.starOn.value);
const sideClass = computed(() => (ctx.store.tapMode === "btn" ? "side" : "side hide"));

const sw = useSwipe({
  cardsEl,
  underEl,
  cardEl,
  card2El,
  isCardView: () => ctx.deck.view.value === "card",
  isBlocked: () => ctx.confirm.open.value || ctx.sync.open.value,
  tapMode: () => ctx.store.tapMode,
  canGo: (d) => {
    const n = ctx.deck.pos.value + d;
    return n >= 0 && n < ctx.deck.orderArr.value.length;
  },
  go: (d) => ctx.deck.go(d),
  wordAtOffset: (d) => {
    const n = ctx.deck.pos.value + d;
    const arr = ctx.deck.orderArr.value;
    return n >= 0 && n < arr.length ? DATA[arr[n]] : null;
  },
  card2Visible: () => rest.value > 0,
});

onMounted(() => {
  sw.bind();
});

function onJump(e: KeyboardEvent) {
  if (e.key !== "Enter") return;
  e.preventDefault();
  e.stopPropagation();
  const q = jumpVal.value.trim();
  if (!q) return;
  const di = ctx.deck.dataIndexOfQ(q);
  if (di >= 0 && ctx.deck.jumpToWord(di)) {
    jumpVal.value = "";
    jumpTip.value = "跳到某个词…";
    return;
  }
  jumpTip.value = "没找到「" + q + "」";
  setTimeout(() => {
    jumpTip.value = "跳到某个词…";
  }, 1600);
}
</script>

<template>
  <div class="bar"><i :style="{ width: pfill }"></i></div>
  <div class="meta">
    <span>{{ pmeta }}</span>
    <span style="display: flex; gap: 14px; align-items: center">
      <input
        v-model="jumpVal"
        class="jump"
        :placeholder="jumpTip"
        title="输入英文单词后按回车，直接跳到那张卡"
        @keydown="onJump"
      />
    </span>
  </div>
  <div class="wrap">
    <div ref="underEl" class="under" aria-hidden="true"></div>
    <div ref="cardsEl" class="cards" :class="{ duo: rest > 0 }">
      <div ref="cardEl" class="card">
        <button
          class="star"
          :title="starOn ? '已在生词本（点这里取消）' : '加入生词本'"
          @click.stop="ctx.toggleStar()"
        >
          {{ starOn ? '★' : '☆' }}
        </button>
        <div class="word">{{ wordText }}</div>
        <div class="ph">
          <span>{{ phon }}</span>
          <button class="spk" title="发音" @click.stop="w && ctx.speak(String(w[0]))">🔊</button>
        </div>
        <!-- eslint-disable-next-line vue/no-v-html -->
        <div class="ans" v-html="ans"></div>
        <div class="hint">{{ hint }}</div>
      </div>
      <div ref="card2El" class="card card2" :class="{ on: rest > 0 }">
        <div class="c2head">{{ c2head }}</div>
        <!-- eslint-disable-next-line vue/no-v-html -->
        <div class="ans" v-html="c2"></div>
      </div>
    </div>
    <div :class="sideClass">
      <button :disabled="empty || ctx.deck.pos.value <= 0" @click="ctx.deck.go(-1)">‹ 上一张</button>
      <button :disabled="empty || ctx.deck.pos.value >= total - 1" @click="ctx.deck.go(1)">下一张 ›</button>
      <span class="cnt">{{ cnt }}</span>
    </div>
  </div>
</template>
