<script setup lang="ts">
import type { AppCtx } from "../lib/ctx";

const props = defineProps<{ ctx: AppCtx }>();
const ctx = props.ctx;
</script>

<template>
  <div id="confirmMask" class="mask" :class="{ hidden: !ctx.confirm.open.value }" @click.self="ctx.confirm.close()">
    <div class="modal cf">
      <div class="mhead">
        <span>{{ ctx.confirm.title.value }}</span><button title="关闭" @click="ctx.confirm.close()">×</button>
      </div>
      <div class="mtips">{{ ctx.confirm.msg.value }}</div>
      <div class="mbtns">
        <button @click="ctx.confirm.close()">取消</button>
        <button class="primary" @click="ctx.confirm.yes()">{{ ctx.confirm.yesText.value }}</button>
      </div>
    </div>
  </div>
</template>
