# 四级词汇 · 离线背单词

一个纯前端、可离线使用的大学英语四级背单词应用。同一份前端代码打包成三种形态：

| 形态 | 文件 | 说明 |
|---|---|---|
| 单文件网页 | `四级词汇.html` | 双击即用，数据内嵌，浏览器离线可跑 |
| Windows 桌面 | `四级词汇.exe` | Electron 打包，免安装单文件 |
| Android | `四级词汇.apk` | WebView 套壳，可安装到手机 |

三端成品在 [Releases](https://github.com/zouzt456/cet4-vocab/releases) 里，资产名用 ASCII：`cet4-vocab.html` / `cet4-vocab.apk` / `cet4-vocab.exe`。

词库共 **3849** 个四级词条（来自 ECDICT 中 `tag` 含 `cet4` 的条目，100% 有中文释义）。

![背单词](docs/answer.png)
![词表查词](docs/list.png)

## 功能

- **卡片交互**：释义与例句常显；`空格`、`←` `→` 切词；手机左右滑动切词——下一个词（词卡连同例句卡）贴着当前内容跟手从侧边盖上来，当前内容不动，松手整屏替换；也可在 ☰ → 切词 改成「上一张 / 下一张」按钮方式（此时不响应滑动）；`s` 发音，`f` 加入生词本。
- **三种排序**：网站词频顺序（默认）、字母序、随机。
- **词表查词**：按英文或中文搜索，点「看卡片」跳转过去。
- **生词本**：收藏、撤回、清空（自绘确认框，避免误触）。
- **进度记录**：认识 / 不认识分别计数，进度条 + 已掌握数，存在 `localStorage`。
- **进度同步**：导出 / 导入 JSON，生词本、模式、停在的词、排序方式一起搬。
- **离线发音**：走浏览器 `speechSynthesis`，不需要联网。

## 技术栈

Vue 3 + TypeScript + Vite（`vite-plugin-singlefile` 打成单个 HTML）+ Pinia 管进度状态，
样式沿用 v1 的 CSS（保证界面不变）；桌面用 Electron，安卓用原生 WebView 壳（aapt2 + d8 + apksigner 手工链路，无 Gradle）。
lint / 格式化用 Biome，单测 Vitest，端到端 Playwright。

## 数据来源

- 词典：[ECDICT](https://github.com/skywind3000/ECDICT)（MIT），字段 `word / phonetic / translation / pos / collins / oxford / bnc / frq / tag / exchange / definition`。
- 例句：从 Tatoeba 的 TED2013、News Commentary、WikiMatrix、QED 等中英句对里筛出，句子长度与中文侧质量都有过滤，每条最多 3 句。
- 例句与释义均为**离线内嵌**，运行时零网络请求。

## 目录结构

```
src/
  App.vue                 三个 tab 的骨架
  components/             WordCard / ExampleList / WordList / StarList / MenuBar / SyncDialog / ConfirmDialog / Toast
  composables/            useProgress / useTheme / useSpeech / useSwipe / useSync / useShortcuts
  stores/progress.ts      Pinia：位置、排序、生词本、认识/不认识
  styles/main.css         v1 的样式（逐像素对齐 v1）
  lib/                    数据索引与工具函数
data/cet4.json            3849 条词条
data/cet4.bnc.json        按 BNC 词频排好序的版本
data/examples.json        例句（按词小写索引）
scripts/gen.py            从 ecdict.csv 抽 cet4 → data/cet4.json
scripts/mkexamples.py     从语料里挖例句
scripts/finalize_ex.py    例句清洗（别名补齐、繁体/错配过滤、去重）
scripts/build.py          旧链路：模板 + 数据 → dist/四级词汇.html（v2 起由 Vite 接管）
electron/                 Electron 主进程与图标
android/                  WebView 壳源码 + build.sh（手工 APK 链路）
tests/unit/               Vitest 单测
tests/e2e/                Playwright 冒烟测试
dist/                     构建产物（不入库）
```

## 本地构建

```bash
pnpm install
pnpm build                    # → dist/index.html（单文件，双击即用）

pnpm dist:exe                 # → release/四级词汇.exe（Electron portable）

# APK：需要 JDK 17 + Android SDK（build-tools / platform android-33）
ANDROID_HOME=/path/to/sdk \
ANDROID_KEYSTORE=/path/to/debug.keystore \
KS_PASS=android KEY_PASS=android \
pnpm apk                      # → release/cet4-vocab.apk
```

数据文件（`data/*.json`）已入库，日常改代码不需要重跑 Python 脚本。
若要重新生成词库：把 ECDICT 的 `ecdict.csv`（约 66 MB）放到仓库根目录，跑 `python scripts/gen.py`。

## 测试

```bash
pnpm exec biome ci .          # lint + 格式检查
pnpm test                     # Vitest 单测（数据条数、进度迁移、导入导出、互斥设置）
pnpm exec playwright install chromium
pnpm test:e2e                 # Playwright：加载 dist/index.html 跑 7 个冒烟场景
```

CI（`.github/workflows/ci.yml`）在 push / PR 时跑 lint + 单测 + 构建 + e2e；
打 `v*` tag 时 `.github/workflows/release.yml` 自动构建三端并发布 Release。

## 许可

- 代码：MIT
- 词典数据：ECDICT，MIT
- 例句：Tatoeba，CC-BY 2.0 FR（例句旁的 `— TED 演讲` 等标注保留来源）
