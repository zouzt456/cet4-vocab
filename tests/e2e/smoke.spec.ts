import { expect, test } from "@playwright/test";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const URL = pathToFileURL(resolve("dist/index.html")).href;

test.beforeEach(async ({ page }) => {
  await page.goto(URL);
});

test("首屏：第一个词、进度、生词本徽标隐藏", async ({ page }) => {
  await expect(page.locator(".word")).toHaveText("state");
  await expect(page.locator(".meta > span").first()).toContainText("第 1 词 / 共 3849 词");
  await expect(page.locator("nav .badge")).toBeHidden();
});

test("空格翻到下一张，进度跟着走", async ({ page }) => {
  await page.locator("body").click();
  await page.keyboard.press("Space");
  await expect(page.locator(".word")).toHaveText("might");
  await expect(page.locator(".meta > span").first()).toContainText("第 2 词 / 共 3849 词");
});

test("收藏后生词本徽标 +1，生词本里能看到这个词", async ({ page }) => {
  await page.locator(".card .star").click();
  await expect(page.locator("nav .badge")).toHaveText("1");
  await page.locator("nav button", { hasText: "生词本" }).click();
  await expect(page.locator("#v-stars .row .w")).toContainText("state");
});

test("词表搜索中文命中、可展开例句", async ({ page }) => {
  await page.locator("nav button", { hasText: "词表查词" }).click();
  await page.locator("#v-list .search").fill("政");
  await expect(page.locator("#v-list .tips")).toContainText("匹配 19 条");
  const first = page.locator("#v-list .row").first();
  await expect(first.locator(".w")).toContainText("state");
  await first.click();
  await expect(first.locator(".eg").first()).toBeVisible();
});

test("夜间模式写 cet4-theme-v1 并给 html 加 dark", async ({ page }) => {
  await page.locator("#menu").click();
  await page.locator(".sheet button", { hasText: "夜间模式" }).click();
  await expect(page.locator("html")).toHaveClass(/dark/);
  const saved = await page.evaluate(() => localStorage.getItem("cet4-theme-v1"));
  expect(saved).toBe("dark");
});

test("同步面板生成的 JSON 能被自己解析（v1 兼容格式）", async ({ page }) => {
  await page.locator("#menu").click();
  await page.locator(".sheet button", { hasText: "同步生词本与进度" }).click();
  await expect(page.locator("#syncMask")).toBeVisible();
  const txt = await page.locator("#syncTxt").inputValue();
  const obj = JSON.parse(txt);
  expect(obj.app).toBe("cet4-vocab");
  expect(obj.schema).toBe(1);
  expect(obj.stats.words).toBe(3849);
  expect(obj.data.pos).toHaveProperty("i");
});

test("旧版 localStorage 进度直接可用（第 1006 词 + 218 个生词）", async ({ page }) => {
  await page.evaluate(() => {
    localStorage.setItem("cet4-pos-v1", JSON.stringify({ order: "bnc", mode: "all", i: 1005, s: 0 }));
    const stars: Record<string, 1> = {};
    for (let i = 0; i < 218; i++) stars["w" + i] = 1;
    localStorage.setItem("cet4-stars-v1", JSON.stringify(stars));
  });
  await page.reload();
  await expect(page.locator(".meta > span").first()).toContainText("第 1006 词 / 共 3849 词");
});
