<script setup lang="ts">
import type { AppCtx } from "../lib/ctx";

const props = defineProps<{ ctx: AppCtx }>();
const ctx = props.ctx;

function pick() {
  const el = document.getElementById("syncFile") as HTMLInputElement | null;
  if (el) el.click();
}
function onFile(e: Event) {
  const input = e.target as HTMLInputElement;
  const f = input.files && input.files[0];
  ctx.sync.readFile(f);
  input.value = "";
}
</script>

<template>
  <div id="syncMask" class="mask" :class="{ hidden: !ctx.sync.open.value }" @click.self="ctx.sync.close()">
    <div class="modal">
      <div class="mhead">
        <span>同步生词本与进度</span><button title="关闭" @click="ctx.sync.close()">×</button>
      </div>
      <div class="mtips">
        生词本、当前模式、两个模式各自停在第几张、背单词顺序，都能搬。做法：这台点「复制」，到另一台粘进下面的框，点「导入」。导入会覆盖接收方现在的进度，请先确认对方没新东西。
      </div>
      <textarea
        id="syncTxt"
        v-model="ctx.sync.txt.value"
        spellcheck="false"
        placeholder="点「生成/刷新」自动填入，或把另一台设备导出的内容粘到这里"
      ></textarea>
      <div class="mbtns">
        <button @click="ctx.sync.refresh()">生成/刷新</button>
        <button @click="ctx.sync.copy()">复制</button>
        <button v-if="!ctx.sync.isAndroid" @click="ctx.sync.download()">下载 .json</button>
        <button v-if="!ctx.sync.isAndroid" @click="pick">选择文件…</button>
        <button v-if="ctx.sync.backupAvail.value" @click="ctx.sync.undo()">撤销上次导入</button>
        <button class="primary" @click="ctx.sync.applyImport()">导入</button>
      </div>
      <input id="syncFile" type="file" accept=".json,application/json" style="display: none" @change="onFile" />
      <div id="syncMsg" :style="{ color: ctx.sync.msgErr.value ? '#d03050' : '#2f6fed' }">{{ ctx.sync.msg.value }}</div>
    </div>
  </div>
</template>
