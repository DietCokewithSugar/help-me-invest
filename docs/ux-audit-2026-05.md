# UX 审计报告 — AI Investment Research

> 审计日期：2026-05-18
> 审计工具：[`ui-ux-pro-max`](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill) v2.5.0
> 审计范围：`/zh`、`/en` 全部路由（首页、Companies 列表 + 详情、Compare、Asset Allocation、Industry、Tracking、Feedback）
> 设计基准：`AGENTS.md` / `CLAUDE.md` 中定义的「Aptos Editorial」设计规范

---

## 摘要 — 一句话结论

这是一个"功能上接近成熟、但在**专业感、可信度、可访问性、移动端可用性**四条线上仍像 Demo 的产品"。
**最致命的两条**：

1. **没有 `<meta viewport>`** —— 在 iOS Safari 上整个页面会被缩放渲染，移动端体验直接崩盘。
2. **所有 Modal 都没有 `role="dialog"` / `aria-modal` / Escape / 焦点陷阱 / `body` 滚动锁**
   —— 键盘用户与读屏用户拿到的是一个"半残废"的弹窗，整体产品看起来像未完工。

下面按严重等级（Severity）从高到低罗列。

> Severity 定义（对齐 UI/UX Pro Max 的 Priority 表）：
> - **P0 — Blocker**：直接影响访问/购买/转化或法务合规，必须立刻修。
> - **P1 — Critical**：违背 WCAG 或核心可用性原则，每天都让用户感到"不专业"。
> - **P2 — High**：明显损伤"成熟感/信任感"，多个细节叠加后用户会主观觉得"像 Demo"。
> - **P3 — Medium**：影响一致性/视觉精度，不会立刻劝退用户但消耗品牌资产。
> - **P4 — Low / Polish**：值得做但优先级低的打磨项。

---

## P0 — Blocker（请立刻处理）

### P0-1 · 缺失 `<meta name="viewport">`
- **位置**：`src/app/layout.tsx` —— `<head>` 中只有 `theme-color` 和字体预连接，**完全没有 viewport meta**。Next.js 14 不会自动注入。
- **后果**：iOS / Android Safari 默认按 980px 桌面视口渲染，整站在手机上**字体微小、横向滚动、按钮可触达但极难点中**。Lighthouse 移动端分会被一票否决。
- **UX Pro Max 引用**：§5 Layout & Responsive · `viewport-meta`
- **修复**：在 `layout.tsx` 中导出
  ```ts
  export const viewport: Viewport = {
    width: 'device-width', initialScale: 1, themeColor: '#0F0E0B',
  };
  ```
  并把 `themeColor` 从 metadata 迁移过来。

### P0-2 · 所有 Modal 不可关闭（键盘）/ 不可被读屏识别 / 背景仍可滚
- **位置**：`CompanyOverviewModal.tsx`、`ContactModal.tsx`、`CompanyFilterModal.tsx`、`ShareExportModal.tsx`、`ExportModal.tsx`、`ReportModal.tsx`。
  全局 `rg "role=|aria-modal|aria-describedby|aria-labelledby" src/components` —— **0 命中**。
  全局 `rg "document.body.style.overflow"` —— **0 命中**。
  全局 `rg "Escape"` —— 只有 `FeedbackWidget`、`compare/page`、`Report` 三处。
- **后果**：
  - 键盘用户按 ESC 弹窗不会关，Tab 会跳出弹窗到背景页 —— 这是**典型的"未完成产品"信号**。
  - 移动端 Modal 打开时背景仍能滚动，弹窗一抖背景跟着抖，廉价感强。
  - VoiceOver / NVDA 把弹窗当普通 `<div>` 朗读，整个流程不可达。
- **UX Pro Max 引用**：§1 Accessibility · `escape-routes`、§9 Navigation · `modal-escape`
- **修复**：抽一个 `<Modal>` 容器统一处理 `role="dialog" aria-modal="true" aria-labelledby={titleId}` + `useFocusTrap` + ESC + `body.overflow:hidden`，所有现存弹窗替换之。

### P0-3 · `<input>` 与表单缺乏 `<form>` / `<label>` 语义
- **位置**：`HomeSearchIsland.tsx`（首页搜索股票代码）、`CompaniesPage.tsx`（公司搜索框）、`MultiSelectDropdown`（筛选器搜索框）、`FeedbackComposer.tsx`（反馈表单）。
- **后果**：iOS 不会显示"前往/搜索"键盘动作；Safari 自动填充失败；读屏只读到 `placeholder`。**这是金融产品最容易被监管/合规审查盯上的弱点**。
- **UX Pro Max 引用**：§1 `form-labels`、§8 `input-labels`、`autofill-support`、`input-type-keyboard`
- **修复**：所有搜索包 `<form role="search" onSubmit={...}>`；每个输入框配 visible `<label>` 或至少 `<label class="sr-only">`；股票代码框加 `autocomplete="off" autocapitalize="characters" inputMode="search"`。

---

## P1 — Critical（违背可访问性 / 严重影响信任感）

### P1-1 · 主要 CTA 用了硬编码的 `#10B981`（财报绿）
- **位置**（共 3 处）：
  - `src/app/[locale]/companies/page.tsx:803` — Filter 区的 Apply 按钮
  - `src/components/CompanyOverviewModal.tsx:366` — "生成报告" 主按钮
  - `src/components/CompanyFilterModal.tsx:251` — Apply 按钮
- **问题**：
  1. 违背 `AGENTS.md` 规则 §2「Theme Consistency · Never hardcode colors」。
  2. 设计系统里 `#10B981` 是**"涨"语义色**（growth），不是主 CTA。在金融产品上拿"利好绿"当主按钮会**误导用户认为这是"买入/确认"按钮**。
  3. 暗色与亮色模式都用同一个绿，亮色模式对比不够（`bg-[#10B981]` + `text-white`，对比比约 3.3:1，未过 4.5:1）。
- **UX Pro Max 引用**：§1 `color-contrast`、§4 `primary-action`、§6 `color-semantic`、§4 `consistency`
- **修复**：所有主 CTA 改用 `.pill-btn`（Aptos 主色按钮）；如果想做"确认"动作的视觉强调，使用 coral accent，不要再借用财报绿。

### P1-2 · 公司诊断标签用了 18 种"彩虹色"
- **位置**：`CompanyOverviewModal.tsx` 第 41-71 行 `DIMENSION_VALUE_COLORS`。`开拓者→蓝、稳固者→绿、分红者→琥珀…健康型→翠绿、贫血型→玫红、政策型→靛蓝、汇率型→黄…`
- **问题**：
  - 颜色没有数据语义（开拓者跟"涨"没有关系），却用了 `green/red/amber` —— **在金融语境会被解读为"好/坏"**，造成误判。
  - 与 Aptos 编辑风（暖中性 + coral/mint/blue 三个克制的 accent）完全冲突，把详情页拉回到"通用 SaaS Dashboard"水平。
- **UX Pro Max 引用**：§4 `style-match`、`consistency`、`color-palette-from-product`；§6 `color-not-decorative-only`
- **修复**：所有诊断标签统一为「暖中性底 + 细描边」（参照 `gemini-badge`），仅靠**文字与排版**区分；如确实要分层，控制在 2-3 个克制色（如：保守=tan、平衡=sand、激进=coral）。

### P1-3 · 报告页 Loading 是"假进度条"，且与实际等待时间脱钩
- **位置**：`src/app/[locale]/companies/[ticker]/page.tsx:30-77`、`146-153`
- **问题**：
  - 进度条按 `(step+1)/5` 线性涨，每 3 秒切一步 —— **不是真实进度，是"动画"**。
  - 5 步图标用了 5 种 `from-glacier-500 to-glacier-600` 等渐变色组合，违背 `AGENTS.md` "No Gradients"。
  - AI 真实生成时间 30s–120s 不等，用户盯到第 5 步还在转就会怀疑卡死 —— **直接削弱"AI 投研专业感"**。
- **UX Pro Max 引用**：§3 `progressive-loading`、§7 `motion-meaning`、§8 `timeout-feedback`
- **修复**：
  1. 将 Loading 替换为**真实可见的 SSE/分章节流式输出**（API 已有 `stream-section`），让用户看到"第 1 段 · 公司画像 ✅ → 第 2 段 · 营收结构…"。
  2. 不能流式时，至少把"假进度"换成 indeterminate skeleton + 真实"已等待 N 秒 / 预计 N 秒"提示。
  3. 移除 5 张渐变图标，统一一个 coral 旋转弧 + 当前阶段中文短句。

### P1-4 · framer-motion 动画未尊重 `prefers-reduced-motion`
- **位置**：全局。`HomeMarketing.tsx`、`Testimonials.tsx`、`Report.tsx`、所有 modal 等大量 `motion.div` + `whileInView` / `initial/animate`。`globals.css` 里的 reduced-motion 媒体查询只能拦截 CSS `transition/animation`，**拦不住 JS 驱动的 Framer**。
- **后果**：开启"减少动效"的用户（前庭/眩晕症、注意力障碍）打开页面仍会看到大量 fade-up + spring 弹动，是 **WCAG 2.1 AA 失败项**。
- **UX Pro Max 引用**：§1 `reduced-motion`、§7 `parallax-subtle`、`interruptible`
- **修复**：
  ```tsx
  import { MotionConfig } from 'framer-motion';
  // 在 layout.tsx
  <MotionConfig reducedMotion="user"> ... </MotionConfig>
  ```
  或在每个 motion 组件读 `useReducedMotion()` 决定 `transition.duration`。

### P1-5 · 没有 `<h1>`，标题层级被打破
- **位置**：首页 `src/app/[locale]/page.tsx:108` 用了 `<h2>` 做 Hero；`companies/page.tsx:644` 也用 `<h2>`；详情页 Loading 用 `<h2>`，整站没有 `<h1>`。
- **后果**：读屏用户用 H 键浏览页面时拿不到主标题；SEO 上 `<h1>` 缺失也会被 Google 标注。
- **UX Pro Max 引用**：§1 `heading-hierarchy`
- **修复**：每个路由保证有且仅有一个 `<h1>`；视觉样式不需要变，只是把语义改成 `h1`。

### P1-6 · 移动端点击目标 < 44pt
- **位置**：
  - 多选下拉框 `MultiSelectDropdown` 中 `w-3 h-3` 的复选框（12px×12px）—— **可点击区域仅 12px**。
  - 公司卡片底部的"View Report"提示是 `opacity-0 group-hover:opacity-100`，**手机上完全看不到**，整张卡片虽可点但缺少明确"按钮"感。
  - `HomeSearchIsland.tsx:464` 删除历史的 `w-5 h-5`，外面没有 `hitSlop` padding。
  - Header 中语言/主题切换 `w-9 h-9` = 36px，**未达 44pt**。
  - `CompanyOverviewModal` 右上角关闭按钮 `p-2 + icon 18px` ≈ 34px。
- **UX Pro Max 引用**：§2 `touch-target-size`、`touch-spacing`、`no-precision-required`
- **修复**：所有 icon-only 按钮最小 `h-11 w-11`（44px），或在更小尺寸基础上加 `padding`/`hitSlop`；公司卡片把 "VIEW REPORT" 改成默认可见的次级按钮。

### P1-7 · 图标按钮缺 `aria-label`，仅靠 `title`
- **位置**：Header 的语言切换/主题切换/汉堡按钮、`Report.tsx` 中的 IconActionButton、`CompanyOverviewModal` 关闭按钮、`HomeSearchIsland` 历史项的 X 按钮等。
- **后果**：`title` 在移动端**完全不显示**，读屏只读到 "button"。
- **UX Pro Max 引用**：§1 `aria-labels`、§2 `gesture-alternative`
- **修复**：每个 icon-only 按钮加 `aria-label={t.xxx}`（已翻译过的字符串），`title` 同步存在以满足桌面端 hover hint。

### P1-8 · 输入框 `focus` 视觉与设计系统脱节，部分缺失
- **位置**：`MultiSelectDropdown` 内嵌搜索框 `focus:outline-none focus:border-accent/50`；`gemini-input` 有焦点环（`box-shadow 0 0 0 3px coral/18%`）但被外层 `outline-none` 在其它输入上覆盖；公司列表 Search Bar 没有 visible focus ring。
- **后果**：键盘 Tab 在表单里"失踪"，对依赖键盘/辅助技术的用户体验崩坏。
- **UX Pro Max 引用**：§1 `focus-states`、`color-not-only`
- **修复**：抽一条统一 `focus-visible:ring-2 focus-visible:ring-glacier-500/40` 工具类，应用到所有 button/input。

---

## P2 — High（明显损伤"成熟感"，多个叠加 = Demo 感）

### P2-1 · "View Report" hover-only 在移动端等于隐藏
- **位置**：`companies/page.tsx:900` —— `opacity-0 group-hover:opacity-100`。
- **后果**：手机用户不知道整张卡可点；即使猜到了，没有 affordance 反馈。这是"看上去像 demo"的典型症状。
- **UX Pro Max 引用**：§2 `hover-vs-tap`、§4 `state-clarity`
- **修复**：默认显示一个低调的「→ 查看报告」次级按钮 + 整卡可点；hover 加深而不是从无到有。

### P2-2 · 字体加载链路冗余 + Next.js 警告
- **位置**：`globals.css:1` 与 `layout.tsx:85-88` 都把同一份 Google Fonts URL 加载了一次（`@import` + `<link>`），并被 Next.js lint 警告 `no-page-custom-font`。
- **后果**：两次请求 + 阻塞渲染 + CLS（FOIT/FOUT），首屏 LCP 直接掉 200-400ms。
- **UX Pro Max 引用**：§3 `font-loading`、`font-preload`、`critical-css`
- **修复**：迁移到 `next/font/google`，让 Next 自托管字体并自动 `font-display: optional`；删除 `globals.css` 的 `@import` 与 head 的 `<link>`。

### P2-3 · `<img>` 取代 `<Image>` 造成 LCP/CLS 退化
- **位置**：`Report.tsx:160`（公司 logo）、`HomeMarketing.tsx:411`（微信 QR）、`ShareExportModal.tsx:409`、`compare/page.tsx:358`。
- **后果**：未声明宽高 → 加载时布局位移；没用 WebP/AVIF；没用 `loading="lazy"`。
- **UX Pro Max 引用**：§3 `image-optimization`、`image-dimension`、`lazy-load-below-fold`
- **修复**：换 `next/image`，强制 `width/height`，logo 走 unoptimized=true（跨域不优化）但保留尺寸占位。

### P2-4 · 5 处硬编码颜色绕过主题系统
- **位置**（`rg "bg-\[#"`）：
  - `HomeSearchIsland.tsx:515` `bg-[#1a1a24]` —— Tooltip 背景
  - `HomeMarketing.tsx:144` `bg-[#fafaf8]` —— 嵌入 iframe 容器（**dark mode 下白方块**）
  - `companies/[ticker]/page.tsx:280` `bg-[#0A0A0B]` —— Suspense fallback（**light mode 下黑屏**）
  - 加上 P1-1 的 `bg-[#10B981]` 三处
- **后果**：light/dark 切换时不同区域闪一下不同色，**用户能直接观察到的"做工粗糙"信号**。
- **UX Pro Max 引用**：§6 `color-semantic`、§4 `dark-mode-pairing`、§7 `layout-shift-avoid`
- **修复**：全部替换为 CSS 变量或 Tailwind token（`bg-surface`、`bg-obsidian`、`bg-elevated`）。

### P2-5 · ECharts 配色与 Aptos 主题完全断层
- **位置**：`FinancialStatements.tsx:69-75`（每个图表都重复一遍）。文字色用了 `#1e293b` / `#94a3b8` / `#334155`（**Tailwind Slate**），tooltip 背景 `#121212`，背景方块也是冷青色调；而 Aptos 主题是 `#171612` 暖墨 + `#CCC5A3` 沙色。
- **后果**：报表区视觉与导航/卡片不在同一个色系，**用户直观感受到"两个产品拼起来的"**。这是金融数据可视化最容易暴露品牌断层的地方。
- **UX Pro Max 引用**：§4 `style-match`、`consistency`、§10 `gridline-subtle`、§6 `color-dark-mode`
- **修复**：抽 `useChartTheme()` Hook，从 CSS 变量读 `--text-secondary`、`--text-muted`、`--border-color`、`--bg-surface`，所有 ECharts 选项统一调用。

### P2-6 · FAQ / 反馈中使用了 `bg-${accent}-500/10` 拼接 Tailwind
- **位置**：`HomeMarketing.tsx:317` —— `bg-${accent}-500/10 border border-${accent}-500/20 text-${accent}-500`。
- **后果**：Tailwind JIT 在编译期看不到完整类名，**class 在生产环境无效**，颜色直接退回到透明 → 三种 FAQ 图标看起来一样。
- **UX Pro Max 引用**：§4 `consistency`、`icon-style-consistent`
- **修复**：换成对象映射 `{glacier: 'bg-glacier-500/10 border-glacier-500/20 text-glacier-500', ...}` 或硬编码 3 套 className。

### P2-7 · `FloatingFeedbackWidget` 与 `HomeButton` 在移动端会同屏挤压
- **位置**：`FeedbackWidget.tsx:63` `fixed bottom-5 right-5` + `HomeButton.tsx:20` `fixed bottom-5 left-5`。两者均在小屏覆盖到内容底部最后 40-60px。
- **后果**：详情页报告底部按钮被遮挡；用户感觉"按钮总在挡内容"。
- **UX Pro Max 引用**：§5 `fixed-element-offset`、`safe-area-awareness`、§2 `safe-area-awareness`
- **修复**：1）主内容 `pb-24 md:pb-12` 预留空间；2）FeedbackWidget 在 `/companies/[ticker]` 详情页改为顶部入口（已经在 Header 有"反馈"链接，可考虑直接复用）；3）使用 `env(safe-area-inset-bottom)`。

### P2-8 · Hero 标题缺乏"信任元素"
- **位置**：`/[locale]/page.tsx` 的 Hero 仅有 title + subtitle + 搜索框；底部 footer 有"已生成 N 份报告"实时数字。
- **问题**：作为投资网站，Hero 区**没有以下任意一条信任信号**：数据来源 logo（FMP、Yahoo Finance）、AI 模型说明（Gemini）、合规免责声明、用户/媒体背书。整体让人感觉"个人项目"。
- **UX Pro Max 引用**：UX Pro Max "Trust & Authority" pattern · `Conversion Focus: Security badges, Case studies, Transparent pricing`
- **修复**：Hero 下方 5px-spaced 加一条数据源 marquee + 一行"powered by Google Gemini · 数据来源 Financial Modeling Prep"小字 + 实时报告计数提到首屏可见处（目前在 footer）。

### P2-9 · Pagination 仅有 Prev/Next + "Page N/M"
- **位置**：`companies/page.tsx:908-927`。
- **问题**：没有"Showing 1-50 of 1234"，没有跳页/跳到末页。1000 家公司翻 20 页才能到底，**用户体感是"看不到尽头的列表"**。
- **UX Pro Max 引用**：§9 `state-preservation`、§5 `content-priority`
- **修复**：补"1–50 / 1234"信息 + 中间几个页码按钮 + 跳转输入。

### P2-10 · 错误提示信息无可恢复路径
- **位置**：`companies/[ticker]/page.tsx:214-240`：错误仅显示文字 + 一个 Retry 按钮（如果可重试）。
- **问题**：不告诉用户「为什么失败」、「是不是这个代码错」、「能不能联系我们」。
- **UX Pro Max 引用**：§8 `error-clarity`、`error-recovery`、`timeout-feedback`
- **修复**：错误文案区分 1) 代码无效 → 直接给搜索框；2) AI 服务超时 → "重试" + "退回基础版"；3) 网络 → "稍后重试"。所有路径附 "Report issue" 链接到 `/feedback`。

### P2-11 · `loading="lazy"` iframe 未声明高度兜底
- **位置**：`HomeMarketing.tsx:150-157` site-intro iframe `aspect-[16/9]` + dark mode 下 `bg-[#fafaf8]`。
- **问题**：iframe 加载完成前先看到一块"亮色矩形"在暗色页中央；移动端 16/9 显示太小（手机宽 375 → iframe 高 211px）字几乎看不清。
- **UX Pro Max 引用**：§3 `content-jumping`、§5 `mobile-first`、§5 `viewport-units`
- **修复**：占位色改 `bg-surface`；移动端 `aspect-[4/5]` 或允许全屏打开。

---

## P3 — Medium（一致性 / 视觉精度）

### P3-1 · 7 处 `useEffect` 依赖数组不完整 → 偶发"该刷新没刷新"
- **位置**（来自 lint 输出）：
  - `companies/page.tsx:541` 缺 `fetchCompanies, filters, searchQuery`
  - `compare/page.tsx:157` 缺 `detailedData, fetchDetailedData, loadingData`
  - `CompanyFilterModal.tsx:130`、`CompanyOverviewModal.tsx:99`、`Report.tsx:889`、`HomeSearchIsland.tsx`（trending fetch 应在 locale 变化时重取，目前 deps=[]）
- **后果**：切换筛选 / 语言 / Ticker 时偶尔不重新拉取，数据"滞后"。
- **修复**：补全依赖；或用 `useMemo` 把 callback 稳定下来。

### P3-2 · 10 处 `react/no-unescaped-entities` 错误
- **位置**：`FinancialRatiosDisplay.tsx`（4 处）、`FinancialRatiosTTMDisplay.tsx`（10 处）、`TextSelectionMenu.tsx`（2 处）。
- **后果**：HTML 渲染时 `"` 直接出在 JSX，部分浏览器/SSR 场景会出现转义警告 / 渲染抖动。`npm run lint` 在 CI 直接红。
- **修复**：把 `"..."` 换成 `&ldquo;...&rdquo;` 或迁移到模板字符串。

### P3-3 · 73 处 `console.log/error` 残留
- **位置**：`rg "console\.(log|error)" src/app src/components | wc -l` = 73。
- **后果**：开发者工具被噪音淹没；用户看到敏感数据（API 失败堆栈）；专业感下降。
- **修复**：抽 `logger.ts`，开发态用 console，生产态走 noop 或 sentry。

### P3-4 · 报告页"折叠区"用 `height: 0; opacity: 0; overflow-hidden` 折叠
- **位置**：`Report.tsx:245`、`Report.tsx:323`。
- **问题**：CSS `height: auto` → `0` 的过渡不会动画化，所以折叠时是"瞬变"，**与 `transition-all duration-300` 写在一起的视觉骗局**。
- **UX Pro Max 引用**：§7 `state-transition`、`transform-performance`
- **修复**：用 framer-motion `<motion.div animate={{ height: expanded ? 'auto' : 0 }}>` 或 `<details>` 原生组件，否则就 0ms 直接切。

### P3-5 · Trending 标签 Tooltip 在移动端隐藏
- **位置**：`HomeSearchIsland.tsx:515` `hidden sm:block`。
- **后果**：手机用户看到 "#1 AAPL" 无解释；只在 ≥ 640px 才看到 hover 提示。
- **修复**：移动端把公司名直接显示在标签下方一行小字。

### P3-6 · ContactModal / FeedbackComposer 的"提交成功"反馈太弱
- **位置**：`FeedbackWidget.tsx:89-110` 提交后只显示一行小标题 + 两个按钮，没有 toast / 声音 / haptic。
- **UX Pro Max 引用**：§8 `success-feedback`、`toast-accessibility`
- **修复**：成功后 toast `role="status" aria-live="polite"` + 200ms 微缩放反馈。

### P3-7 · 财务比率表 Tooltip 用了 `title` 属性
- **位置**：`FinancialRatiosTTMDisplay.tsx`、`FinancialRatiosDisplay.tsx`（多个 `title=` 用作解释）。
- **问题**：移动端不可见；不能键盘聚焦呼出；不能换行/格式化。
- **UX Pro Max 引用**：§10 `tooltip-on-interact`、`tooltip-keyboard`
- **修复**：抽统一的 `<MetricHint>` 组件，按 design-system §「Interactive Data Rows」实现，触摸+键盘都可用。

### P3-8 · 没有 Skeleton，只有 "Loading data" 文字
- **位置**：`companies/page.tsx:829`（公司列表 loading）、`CompanyOverviewModal.tsx:295`（相关公司 loading）、`feedback/page.tsx` 等。
- **后果**：用户先看到大片空白 → 然后内容突然"砰"地一下出现，CLS 大 + 焦虑感强。
- **UX Pro Max 引用**：§3 `progressive-loading`、`content-jumping`
- **修复**：每个列表/卡片做 Skeleton 占位（同样的 grid + 半透明矩形）。

### P3-9 · Modal 与对话框宽度 / 高度溢出策略不一致
- **位置**：`CompanyOverviewModal` 用 `max-w-3xl max-h-[90vh]`；`ShareExportModal`、`ReportModal` 各自一套；FeedbackWidget popover `w-[min(360px,calc(100vw-2.5rem))]`。
- **后果**：iPad 横屏体验各页不一致，宽度感不连贯。
- **修复**：抽 `<DialogContainer size="md|lg|xl">`，统一 width / padding / max-height。

### P3-10 · 链接/可点击行无 `cursor-pointer`
- **位置**：报告内 `Row` 行 `hover:bg-white/5`（许多）但部分没有 `cursor-pointer`；`CompanyFilterModal` 行同。
- **UX Pro Max 引用**：§2 `cursor-pointer`
- **修复**：全部加 `cursor-pointer`，或用 `<button>` 语义。

### P3-11 · Feedback 入口与"在线客服"图标都使用 lucide `MessageSquarePlus` / `MessageCircle`，语义重复
- **位置**：`FeedbackWidget.tsx`、Header `t.header.contact`、FAQ 微信入口都触发联系流程。
- **修复**：明确分工 —— Header 链接 = Contact（同步 IM），底部按钮 = Feedback（异步 bug/feature），文案 + 图标分别使用 `MessageCircle` 和 `Bug` / `Lightbulb`。

### P3-12 · `console.log('获取研报总数失败:', err)` 等中英混用
- **位置**：`HomeMarketing.tsx:79`、`companies/page.tsx:519`、`CompanyOverviewModal.tsx:120` 等。
- **修复**：i18n 项目里 `console.error` 用英文键，不要把中文埋进运行时字符串。

---

## P4 — Low / Polish（加分项）

### P4-1 · 加 `<link rel="manifest">` 与正方/圆形 Apple Touch Icon
- 投资类网站常会被用户"添加到主屏幕"，需要 PWA manifest 提升专业度。

### P4-2 · 加 sitemap 中的报告页 `lastmod` + Open Graph 动态图（OG image per company）
- 当前 `/[ticker]` 报告页分享出去只有默认 OG，不利传播。

### P4-3 · 在 Hero/Footer 加合规免责声明
- 例如「本网站不构成投资建议」固定锚点，金融产品必备。

### P4-4 · 报告页支持 "深链 + 锚点" 已有 `scroll-mt-28`，但 ToC `SideAnchorNav` 仅 ≥ xl (1280px) 显示
- 移动端应有"顶部 sticky 章节进度条"。

### P4-5 · 公司搜索支持中文名（"贵州茅台" → 600519.SS）
- 当前必须输入代码，对中文用户门槛偏高。

### P4-6 · `next/font` 与字幕/字距优化
- Fraunces 变量轴 `WONK` 在 Hero 用得克制，副标题/正文 `WONK 0` 即可；目前的 SOFT/WONK 组合在不同设备字重不稳。

### P4-7 · 公司卡片"市值"和"扇区"用同样字号
- 视觉权重不分主次，市值应该粗体（投资人主要关心的数据），扇区降为小标签。

### P4-8 · `FlipCounter` 在首页 footer 加载，导致页面底部 CLS
- 用骨架 `tabular-nums` 占位 + Suspense 已经放了 fallback，但 fallback 占位是 `—`，可以预留固定宽度避免抖动。

### P4-9 · 顶部 Pill 浮动导航的"返回首页"
- 当前 logo + 一个左下角悬浮 `HomeButton`，重复入口。建议保留 Logo 点击回家，移除 `HomeButton` 或转为"返回上一页"。

### P4-10 · 报告页的"分享/导出"在桌面端隐藏在 hover 后才显现
- 应该默认可见，提升"成熟产品"信号。

### P4-11 · `Testimonials` 用户头像是否有真名 + 真实头像 / 单位 logo
- 没有"实名 + 单位"的客户证言信任度低。如果是 mock 数据，建议先下线，等真实用户证言再上。

---

## 整改路线建议（按工作量与杠杆比排序）

1. **第一刀（半天投入，最高 ROI）**：P0-1 viewport + P0-2 抽 `<Modal>` 容器 + P1-1 移除 `#10B981`。
   完成后整站立刻变得"像正式产品"。
2. **第二刀**：P1-3 Loading 改成真实 SSE 流式 + P1-4 `MotionConfig reducedMotion="user"`。
3. **第三刀**：P2-5 ECharts 主题对齐 + P2-2 字体迁移到 `next/font` + P2-4 清除硬编码颜色。
4. **第四刀**：P1-6 触摸目标 + P1-7 aria-label + P1-8 focus-visible —— 把可访问性短板补齐。
5. **第五刀**：P2-8 Hero 信任元素 + P2-9 分页 + P2-10 错误恢复 + P4-3 合规免责。

完成 1–4 已经可以让网站从"Demo 感"跃迁到"成熟可投放"。完成 5 才算"专业可信的投资工具"。

---

## 附录 · 检索命令复现

```bash
# 安装 skill（一次性）
python3 .agents/skills/ui-ux-pro-max/scripts/search.py "fintech investment trust dashboard" --design-system

# 后续在做某个模块时
python3 .agents/skills/ui-ux-pro-max/scripts/search.py "modal dialog focus trap" --domain ux
python3 .agents/skills/ui-ux-pro-max/scripts/search.py "data visualization dark mode" --domain chart
python3 .agents/skills/ui-ux-pro-max/scripts/search.py "react performance lcp font" --stack react
```
