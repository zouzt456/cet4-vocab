import { defineConfig } from "@playwright/test";

// 直接打开构建产物 dist/index.html（file:// 即可，和用户双击的用法一致）
export default defineConfig({
  testDir: "tests/e2e",
  timeout: 20000,
  fullyParallel: false,
  reporter: "list",
  use: {
    viewport: { width: 1440, height: 940 },
    trace: "off",
  },
});
