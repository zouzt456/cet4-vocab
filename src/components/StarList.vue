<script setup lang="ts">
import { computed, ref } from "vue";
import { DATA } from "../lib/data";
import type { AppCtx } from "../lib/ctx";
import { rowEgsHtml } from "../lib/exampleDom";
import { keyOf } from "../lib/marks";

const props = defineProps<{ ctx: AppCtx }>();
const ctx = props.ctx;

interface Row {
  i: number;
  key: string;
  word: string;
  ph: string;
  tr: string;
}

const expanded = ref<Record<number, 1>>({});

const rows = computed<Row[]>(() => {
  const out: Row[] = [];
  for (let i = 0; i < DATA.length; i++) {
    const w = DATA[i];
    const k = keyOf(w);
    if (!ctx.store.stars[k]) continue;
    out.push({ i, key: k, word: String(w[0]), ph: String(w[1] || ""), tr: String(w[2] || "") });
  }
  return out;
});
const tips = computed(() =>
  rows.value.length
    ? "生词本 " + rows.value.length + " 个（点词条展开释义和例句，点 ★ 移出）"
    : "生词本还是空的：背单词时点卡片右上角 ☆ 或按 f 收藏",
);

function toggle(i: number) {
  if (expanded.value[i]) delete expanded.value[i];
  else expanded.value[i] = 1;
}
function remove(k: string) {
  if (ctx.store.stars[k]) delete ctx.store.stars[k];
  ctx.store.persistStars();
}
function jump(i: number) {
  ctx.deck.jumpToWord(i);
}
</script>

<template>
  <div class="tips">{{ tips }}</div>
  <div>
    <div v-for="r in rows" :key="r.i" class="row" :class="{ open: !!expanded[r.i] }" @click="toggle(r.i)">
      <div class="w">
        <button class="st" title="移出生词本" @click.stop="remove(r.key)">★</button>{{ r.word
        }}<em v-if="r.ph">{{ r.ph }}</em
        ><button class="tocard" title="跳到这张卡" @click.stop="jump(r.i)">看卡片 ›</button>
      </div>
      <div class="t">{{ r.tr }}</div>
      <div v-if="expanded[r.i]" style="display: contents" v-html="rowEgsHtml(DATA[r.i])"></div>
    </div>
    <div v-if="!rows.length" class="empty">暂无生词</div>
  </div>
</template>
