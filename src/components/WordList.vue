<script setup lang="ts">
import { computed, ref } from "vue";
import { DATA } from "../lib/data";
import type { AppCtx } from "../lib/ctx";
import { rowEgsHtml } from "../lib/exampleDom";

const props = defineProps<{ ctx: AppCtx }>();
const ctx = props.ctx;

interface Row {
  i: number;
  word: string;
  ph: string;
  tr: string;
}

const q = ref("");
const expanded = ref<Record<number, 1>>({});

const matched = computed(() => {
  const key = q.value.trim().toLowerCase();
  const out: Row[] = [];
  let n = 0;
  for (let i = 0; i < DATA.length; i++) {
    const w = DATA[i];
    const word = String(w[0]);
    const tr = String(w[2] || "");
    if (key && word.toLowerCase().indexOf(key) < 0 && tr.toLowerCase().indexOf(key) < 0) continue;
    n++;
    if (out.length < 400) out.push({ i, word, ph: String(w[1] || ""), tr });
  }
  return { rows: out, n };
});
const rows = computed(() => matched.value.rows);
const tips = computed(() => {
  const key = q.value.trim();
  const n = matched.value.n;
  if (key) return "匹配 " + n + " 条" + (n > 400 ? "，仅显示前 400 条" : "") + "，点击展开释义和例句";
  return "全部 " + DATA.length + " 条，点击展开释义和例句";
});

function toggle(i: number) {
  if (expanded.value[i]) delete expanded.value[i];
  else expanded.value[i] = 1;
}
function jump(i: number) {
  ctx.deck.jumpToWord(i);
}
</script>

<template>
  <input v-model="q" class="search" placeholder="输入单词或中文意思查找…" autocomplete="off" />
  <div class="tips">{{ tips }}</div>
  <div id="list">
    <div v-for="r in rows" :key="r.i" class="row" :class="{ open: !!expanded[r.i] }" @click="toggle(r.i)">
      <div class="w">
        {{ r.word }}<em v-if="r.ph">{{ r.ph }}</em
        ><button class="tocard" title="跳到这张卡" @click.stop="jump(r.i)">看卡片 ›</button>
      </div>
      <div class="t">{{ r.tr }}</div>
      <!-- 展开的例句直接挂在行里（display:contents 让 .egs 成为 .row 的实际子元素，样式与 v1 一致） -->
      <div v-if="expanded[r.i]" style="display: contents" v-html="rowEgsHtml(DATA[r.i])"></div>
    </div>
    <div v-if="!rows.length" class="empty">没有找到，换个词试试</div>
  </div>
</template>
