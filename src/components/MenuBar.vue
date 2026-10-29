<script setup lang="ts">
import { computed } from "vue";
import type { AppCtx } from "../lib/ctx";

const props = defineProps<{ ctx: AppCtx }>();
const ctx = props.ctx;

const dark = computed(() => ctx.theme.dark.value);
const clearText = computed(() => (ctx.store.starCount ? "清空生词本（" + ctx.store.starCount + "）" : "清空生词本"));

function toggleMenu() {
  ctx.menuOpen.value = !ctx.menuOpen.value;
}
function onTheme() {
  ctx.menuOpen.value = false;
  ctx.theme.toggle();
}
function onSync() {
  ctx.menuOpen.value = false;
  ctx.sync.openSync();
}
function onMode(e: Event) {
  const v = (e.target as HTMLSelectElement).value;
  ctx.deck.setMode(v === "star" ? "star" : "all");
}
function onOrder(e: Event) {
  const v = (e.target as HTMLSelectElement).value;
  ctx.deck.setOrder(v === "alpha" ? "alpha" : v === "rand" ? "rand" : "bnc");
}
function onTap(e: Event) {
  ctx.store.setTapMode((e.target as HTMLSelectElement).value === "btn" ? "btn" : "swipe");
}
</script>

<template>
  <header>
    <button id="menu" class="theme" :title="dark ? '菜单（当前夜间）' : '菜单（当前日间）'" @click.stop="toggleMenu">☰</button>
    <div class="sheet" :class="{ hidden: !ctx.menuOpen.value }">
      <button @click.stop="onTheme">
        <span class="ic">{{ dark ? '☀️' : '🌙' }}</span><span>{{ dark ? '日间模式' : '夜间模式' }}</span>
      </button>
      <button @click.stop="onSync"><span class="ic">⇄</span><span>同步生词本与进度</span></button>
      <div class="msel">
        <label>
          <span>模式</span>
          <select id="mode" :value="ctx.store.mode" @change="onMode">
            <option value="all">全部单词</option>
            <option value="star">只背生词</option>
          </select>
        </label>
        <label>
          <span>顺序</span>
          <select id="order" :value="ctx.store.order" @change="onOrder">
            <option value="bnc">网站词频顺序（默认）</option>
            <option value="alpha">字母</option>
            <option value="rand">随机</option>
          </select>
        </label>
        <label>
          <span>切词</span>
          <select id="tapMode" :value="ctx.store.tapMode" @change="onTap">
            <option value="swipe">左右滑动</option>
            <option value="btn">上一张 / 下一张</option>
          </select>
        </label>
      </div>
      <button @click.stop="ctx.goFirst()"><span class="ic">↩</span><span>回到第一个词</span></button>
      <button @click.stop="ctx.clearStars()"><span class="ic">☆</span><span>{{ clearText }}</span></button>
    </div>
    <nav>
      <button :class="{ on: ctx.deck.view.value === 'card' }" @click="ctx.activate('card')">背单词</button>
      <button :class="{ on: ctx.deck.view.value === 'list' }" @click="ctx.activate('list')">词表查词</button>
      <button :class="{ on: ctx.deck.view.value === 'stars' }" @click="ctx.activate('stars')">
        生词本<span class="badge" :class="{ hidden: !ctx.store.starCount }">{{ ctx.store.starCount }}</span>
      </button>
    </nav>
  </header>
</template>
