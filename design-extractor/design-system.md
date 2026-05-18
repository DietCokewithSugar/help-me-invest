# Aptos Network — Design System Guide

源站：`https://aptosnetwork.com`
提取时间：2026-05-18

---

## 0. Overview

Aptos 官网采用**温暖中性 + Editorial Serif** 风格——介于科技品牌与杂志式排版之间。

- **定位**：高端、克制、文学化的 Web3 基础设施品牌站
- **设计语言关键词**：`editorial` `warm-neutral` `variable-typography` `motion-as-content` `dual-mode`
- **主要使用场景**：品牌着陆页、生态展示、白皮书入口、开发者门户
- **签名特征**：
  1. 可变字体 **Season Serif** 的 `SERF` 轴在 hero 文字处从 sans (0) 过渡到 serif (70)
  2. 大面积 mint `#D5FAD3` 与 black `#0F0E0B` 的极简撞色
  3. 浮岛式胶囊导航（floating pill navbar），始终居中悬浮
  4. 滚动驱动的 `parallax-in/out` + `stackable-shrink` 卡片动效，无任何 JS 动画库

---

## 1. Design Principles

1. **Editorial First** — 设计向印刷品靠拢，正文与标题都用 Season Serif；版心宽、边距大、用空白讲故事。
2. **Warmth Over Sterility** — 拒绝纯白纯黑；用 `#F9F9F0` 与 `#0F0E0B` 替代 `#FFFFFF` 与 `#000000`，所有中性色都带暖黄底色。
3. **Motion as Meaning** — 仅在文字与卡片堆叠处使用动效；`text-mask-in/out` 让正文字体在变形中变成衬线，呼应「编辑性」。
4. **Dual Mode Native** — 整套配色用 CSS `light-dark()` 函数声明，无 class 切换；夜间模式不是补丁。
5. **No Decoration** — 零渐变、零阴影投射、零毛玻璃；只有 1px 半透明描边与纯色填充。

---

## 2. Color Palette

详见 [`palette.md`](./palette.md)。简表：

| 类别 | Token | Light | Dark |
| --- | --- | --- | --- |
| Background | `surface-100` | `#F9F9F0` | `#0F0E0B` |
| Card | `surface-200` | `#EFECCA` | `#171612` |
| Text Primary | `inverted-100` | `#0F0E0B` | `#F9F9F0` |
| Border | `border` | `rgba(0,0,0,0.15)` | `rgba(255,255,255,0.15)` |
| Accent Mint | `accent-mint` | `#D5FAD3` | `#D5FAD3` |
| Accent Blue | `accent-blue` | `#BADBEE` | `#BADBEE` |
| Accent Coral | `accent-coral` | `#FF8866` | `#FF8866` |

**使用规则速查**
- ✅ Hero 用 `mint` 平铺；分区用 `blue` 平铺；CTA 用 `black`
- ✅ 一屏只允许一种强调色出现
- ❌ 不使用渐变、不使用纯白 `#FFFFFF`、不使用 `tan/sand` 做硬描边
- 颜色组合：`mint + black` / `blue + black` / `white + ash` / `coal + cream`

---

## 3. Typography

### 3.1 字体家族

| Family | 角色 | 性格 | 适用场景 |
| --- | --- | --- | --- |
| **Season Serif** (变量字体) | 通用字体 | 优雅、editorial，自带 `SERF` 轴：0 = humanist sans，70 = full serif | 一切显示与正文 |
| **Akkurat Mono** | UI 标签 / 代码 | 干净的网格化等宽 | 导航 label、按钮文字、代码片段、Footer 分组标题 |

### 3.2 字体组合规则
- **标题与正文都用 Season Serif** —— 通过 `font-variation-settings: "SERF" 0 / 70` 切换调性。
- **Mono 仅出现在 UI 元数据**（label、code、breadcrumb、kicker）。
- 任何 `class="typography-mono"` 的元素**必须 uppercase + letter-spacing 0.03em**。

### 3.3 字阶表（桌面端 ≥ 1024px）

| Token | Size | Weight (variable) | Line-height | Letter-spacing | 用途 |
| --- | --- | --- | --- | --- | --- |
| `text-2xs` | 0.563rem (9px) | 400 | 130% | 0.02em | 角标 |
| `text-xs` | 0.688rem (11px) | 400 | 130% | 0.03em | 元数据、版权 |
| `text-sm` | 0.813rem (13px) | 358 | 140% | 0.02em | 辅助文本 |
| `text-base` | 1rem (16px) | 358 | 140% | 0.02em | **正文** |
| `text-lg` | 1.125rem | 444 | 140% | 0.01em | Lead 段落 |
| `text-xl` | 1.25rem | 444 | 125% | -0.01em | 小标题 |
| `text-2xl` | 1.5rem | 420 | 110% | -0.02em | 模块标题 |
| `text-3xl` | 2.25rem | 420 | 110% | -0.02em | 区块标题 |
| `text-4xl` | 3.438rem (55px) | 420 | 100% | -0.02em | Page Heading |
| `text-5xl` | 5.625rem (90px) | **335** | 95% | -0.02em | **Hero H1** |
| `text-6xl` | 7.5rem (120px) | **335** | 95% | -0.03em | Display |

### 3.4 可变字重说明
Aptos 没有使用整 100 的字重档（400/500/700），而是采用**非整数字重**——这是 Season Serif 变量字体的真实坐标：
- `335` / `358` / `420` / `444` 都是不同 `wght` 轴的精确取值
- 越大的字号反而越细（`text-5xl` 用 `335`），这是 editorial 排版的典型做法
- 落地时若无变量字体，可用最接近的整数权重：`335→300`、`358→400`、`420→400`、`444→500`

### 3.5 响应式字号

| Token | mobile (<768px) | tablet (≥768px) | desktop (≥1024px) |
| --- | --- | --- | --- |
| `text-3xl` | 1.375rem | 1.75rem | 2.25rem |
| `text-4xl` | 2rem | 2.5rem | 3.438rem |
| `text-5xl` | 2.75rem | 3.5rem | 5.625rem |
| `text-6xl` | 3.75rem | 5rem | 7.5rem |

### 3.6 特殊排版规则
- **Mono uppercase**：所有 `font-mono` 文字一律大写 + 字间距 `0.03em`（如 `ABOUT`、`ECOSYSTEM`、`MODULE APTOS`）。
- **Hero 字体形变**：标题使用 `@keyframes text-mask-in` —— clip-path 从左推出的同时 `font-variation-settings: "SERF" 0 → 70`，呈现 sans→serif 形变。

---

## 4. Spacing System

### 4.1 基础单位
**`--spacing: 5px`**（Tailwind 4 自定义 base）。所有数值都是 5px 的整数倍。

| Token | Value | 用途 |
| --- | --- | --- |
| `xs` | 5px | icon ↔ label 间距 |
| `sm` | 10px | 表单元素内部 padding |
| `md` | 20px | 卡片内边距 |
| `lg` | 40px | 段落间距、组件外边距 |
| `xl` | 80px | 区块上下间距 |
| `2xl` | 120px | 大区块分隔 |
| `3xl` | 200px | Hero 顶部留白 |

### 4.2 容器宽度

| Token | Value | 用途 |
| --- | --- | --- |
| `container-xl` | 36rem (576px) | 文章正文 |
| `container-2xl` | 42rem | 介绍段落 |
| `container-4xl` | 56rem | 单列内容 |
| `container-5xl` | 64rem | 标准内容区 |
| `breakpoint-big` | 110rem (1760px) | 超宽屏断点 |

### 4.3 组件内距 vs 布局间距
- **组件内 padding**：12px–24px（按钮 12px×24px，卡片 24px）
- **布局 gutter**：桌面 80–120px，移动 40–60px
- **行间距**：段落使用 `gap: 40px`，分组使用 `gap: 80px`

---

## 5. Component Styles

完整组件文档见 [`components.md`](./components.md)。本节给出核心规格摘要。

### 5.1 Floating Pill Navbar
- 视觉：圆角胶囊 `border-radius: 9999px`、`background: white #F9F9F0`、`border: 1px rgba(0,0,0,0.1)`、`box-shadow: 0 4px 12px rgba(15,14,11,0.08)`
- 位置：`position: fixed; top: 20px; left: 50%; transform: translateX(-50%);`
- 内部：左 logo + 中间菜单（mono uppercase）+ 右 CTA 实心黑按钮
- 状态：滚动时无形变，始终保持 pill 形态；菜单 hover 出现 dropdown
- Token：`shadow-md` + `radius-pill` + `accent-coral` (CTA)

### 5.2 Primary Button (Pill)
- Default：`bg: #0F0E0B` `color: #F9F9F0` `padding: 12px 24px` `font-mono uppercase`
- Hover：`opacity: 0.8` 或 `bg: #2F2D28`
- Active：`scale(0.98)`
- Disabled：`opacity: 0.4` + `cursor: not-allowed`
- 圆角：`9999px`（pill）

### 5.3 Content Card（image + text）
- Layout：左文右图 50/50，桌面 `gap: 80px`
- Card padding：`24px`
- Image：黑白滤镜 `filter: grayscale(1)` 或饱和度 60%
- Title：`text-3xl`，正文 `text-base`

### 5.4 Stackable Card
- 使用 `@keyframes stackable-shrink`：滚动到下一张时，上一张 `scale: 1 → 0.8`
- 触发：scroll-driven animation `animation-timeline: view()`
- 圆角：`12px`

### 5.5 Marquee Strip
- 文字横向滚动 `@keyframes marquee-rtl / marquee-ltr`
- 容器 `overflow: hidden`，两侧 `linear-gradient(to right, var(--bg), transparent)` 软淡出
- 速度：CSS 变量 `--duration: 30s linear infinite`

### 5.6 Accordion / Disclosure
- 原生 `<details>` 标签 + 自定义 `summary`
- 展开状态：箭头 90° 旋转，过渡 `0.15s ease-in-out`
- 分隔线：`border-bottom: 1px solid rgba(0,0,0,0.1)`

### 5.7 Theme Toggle Pill
- 三段切换：`SYSTEM / LIGHT / DARK`
- 选中态：`bg: #0F0E0B`，文字 `#F9F9F0`，mono uppercase
- 父容器：`background: #F9F9F0` + `border: 1px solid rgba(0,0,0,0.1)`、`radius: 9999px`

---

## 6. Shadows & Elevation

Aptos 是一个**接近 flat** 的设计系统。仅在悬浮元素上使用极轻的暖色阴影。

| Token | CSS Value | 使用场景 |
| --- | --- | --- |
| `shadow-sm` | `0 1px 2px rgba(15,14,11,0.06)` | 输入框 focus |
| `shadow-md` | `0 4px 12px rgba(15,14,11,0.08)` | **Floating navbar** |
| `shadow-lg` | `0 12px 32px rgba(15,14,11,0.12)` | Dropdown menu |
| `shadow-xl` | `0 24px 60px rgba(15,14,11,0.16)` | Modal / Dialog |

**暗模式处理**：阴影颜色保持暖色（`rgba(15,14,11,…)`），但透明度提升一档（×1.5）以保持可见性；通常用 `border-top: 1px solid rgba(255,255,255,0.08)` 模拟 elevation 而非投影。

---

## 7. Animations & Transitions

### 7.1 Duration

| Token | Value | 使用场景 |
| --- | --- | --- |
| `duration-fast` | 0.15s | hover、focus、color 切换 |
| `duration-normal` | 0.3s | dropdown 展开、accordion |
| `duration-slow` | 1s | text-mask-out（hero 退出） |
| `duration-epic` | 2s | text-mask-in（hero 入场） |

### 7.2 Easing

| Token | cubic-bezier | 适用场景 |
| --- | --- | --- |
| `ease-standard` | `cubic-bezier(0.4, 0, 0.2, 1)` | 默认 |
| `ease-out` | `cubic-bezier(0, 0, 0.2, 1)` | 元素进入 |
| `ease-in` | `cubic-bezier(0.4, 0, 1, 1)` | 元素退出 |
| `ease-text-mask` | `cubic-bezier(0.76, 0, 0.24, 1)` | **签名 easing**——hero 字体形变 |

### 7.3 关键 keyframes

| 名称 | 效果 | 触发 |
| --- | --- | --- |
| `text-mask-in` | clip-path 从左揭开 + `SERF` 轴 0→70（sans→serif） | 元素进入视口 |
| `text-mask-out` | clip-path 向右收 + `SERF` 70→0 | 元素离开视口 |
| `appear-mask-in-from-right` | 从右 clip-path 揭开 + 字重 375→variable | hero 副文案 |
| `parallax-in` | `translateY(20%) → 0` | scroll-driven 入场 |
| `parallax-out` | `translateY(0) → 50%` | scroll-driven 出场 |
| `stackable-shrink` | `scale 1 → 0.8` | 卡片堆叠后退 |
| `marquee-ltr` / `marquee-rtl` | `translateX(±100%)` | logo / 关键词流 |
| `fade` | `opacity 0 → 1` | 通用淡入 |

### 7.4 滚动驱动动画
全站使用 CSS Scroll-Driven Animations：

```css
.parallax-element {
  animation-timeline: view();
  animation-name: parallax-in;
  animation-range: entry cover 20%;
}
```

### 7.5 prefers-reduced-motion
所有自定义动画都包裹在：
```css
@media (prefers-reduced-motion: no-preference) {
  /* 动画规则 */
}
```
辅以 `motion-reduce:transition-none motion-reduce:transform-none` utility 兜底。

---

## 8. Border Radius

| Token | Value | 使用场景 |
| --- | --- | --- |
| `radius-sm` | 4px | tag、徽标 |
| `radius-md` | 6px | 表单输入 |
| `radius-lg` | 12px | 卡片、图片容器 |
| `radius-xl` | 24px | 大型 panel |
| `radius-pill` | 9999px | **Navbar / 按钮 / Toggle**（核心识别特征） |

> Aptos 几乎不用「中等圆角」，而是两极分化：`12px` 用于卡片，`9999px` 用于交互元素。

---

## 9. Opacity & Transparency

| Token | Value | 用途 |
| --- | --- | --- |
| `opacity-disabled` | 0.4 | 禁用按钮、灰显文字 |
| `opacity-muted` | 0.6 | 次要信息 |
| `opacity-hover` | 0.8 | hover 状态 |
| `opacity-overlay` | 0.15 | 描边色（`rgba(0,0,0,0.15)`） |

**规则**
- 描边一律用半透明黑/白（`rgba(0,0,0,0.10–0.30)`），不直接使用 `tan` 等实色
- 文字 muted 用 `text-muted` token 而非降低 opacity
- 不使用 `backdrop-filter: blur` —— Aptos 全站零毛玻璃

---

## 10. Responsive Design

### 10.1 断点

| 名称 | rem | px | 目标设备 |
| --- | --- | --- | --- |
| `sm` | 40rem | 640 | 大手机 |
| `md` | 48rem | 768 | 平板 |
| `lg` | 64rem | 1024 | 桌面 |
| `xl` | 80rem | 1280 | 大桌面 |
| `2xl` | 96rem | 1536 | 4K |
| `big` | 110rem | 1760 | 超宽屏 |

### 10.2 布局规则
- 默认 mobile-first
- Floating navbar 在所有断点都居中浮动；移动端宽度收缩为 `90vw`
- 卡片网格 `< md`: 1 列 / `≥ md`: 2 列 / `≥ lg`: 3 列
- Hero H1 在移动端从 `text-5xl (5.625rem)` 缩到 `2.75rem`

### 10.3 字号断点表
参见第 3.5 节响应式字号。

---

## 11. Common Usage Patterns (Tailwind 4)

Aptos 站点基于 Tailwind 4，高频组合：

| 视觉效果 | Class 组合 |
| --- | --- |
| Pill 按钮 | `inline-flex items-center px-6 py-3 rounded-full bg-black text-white font-mono uppercase tracking-wider text-xs` |
| Floating navbar | `fixed top-5 left-1/2 -translate-x-1/2 rounded-full bg-surface-100 border border-black/10 shadow-md px-2 py-2` |
| Hero 区 | `min-h-screen bg-accent-mint flex items-end pb-20 px-6` |
| Editorial 标题 | `font-serif text-5xl md:text-6xl tracking-tight leading-[0.95]` |
| Mono 标签 | `font-mono text-xs uppercase tracking-[0.03em] text-ink/60` |
| 卡片 | `rounded-xl bg-surface-200 p-6 border border-black/5` |
| Marquee 容器 | `relative overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_10%,black_90%,transparent)]` |

```html
<!-- Floating Pill Navbar -->
<header class="fixed top-5 left-1/2 -translate-x-1/2 z-50
               flex items-center gap-6
               rounded-full bg-[#F9F9F0] border border-black/10
               shadow-[0_4px_12px_rgba(15,14,11,0.08)]
               px-3 py-2">
  <a href="/" class="px-4 font-serif text-sm">Aptos</a>
  <nav class="flex gap-5 font-mono text-xs uppercase tracking-wider">
    <a href="#">About</a><a href="#">Ecosystem</a><a href="#">Build</a>
  </nav>
  <a class="rounded-full bg-black text-[#F9F9F0]
            font-mono text-xs uppercase tracking-wider
            px-5 py-2">Get Started</a>
</header>
```
