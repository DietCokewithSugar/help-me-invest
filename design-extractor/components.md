# Aptos Network — Components

源站：`https://aptosnetwork.com`
基于 `raw.json` 提取到的组件骨架与截图重建。

---

## Header / Floating Pill Navbar

### 结构说明
- **形态**：胶囊（pill）容器，水平居中固定浮动
- **位置**：`position: fixed; top: 20px; left: 50%; transform: translateX(-50%);`
- **行为**：始终保持 pill 形态，不会在滚动后变形或贴边
- **构成**：`logo + <ul role="menubar"> + 实心 CTA 按钮`
- **下拉菜单**：基于原生 `popover` API（`popovertarget` + `aria-haspopup="true"`），无 JS 库

### 状态
- `default` — 背景 `#F9F9F0`，1px 半透明黑描边，shadow-md
- `hover (menu item)` — 添加 `border-bottom: 1px solid currentColor`
- `aria-expanded="true"` — 文字颜色变为 `inverted-100`，底部出现 border
- `mobile (< 768px)` — 宽度 90vw，menubar 隐藏，出现 hamburger 切换全屏 overlay

### 关键 token
- `surface-100` 背景 / `border-default` 描边 / `radius-pill` / `shadow-md`
- 菜单字体：`font-mono uppercase text-xs tracking-[0.03em]`

### 示例 HTML（简化）
```html
<header class="fixed top-5 left-1/2 -translate-x-1/2 z-50
               inline-flex items-center gap-6
               rounded-full bg-surface-100 border border-black/10
               shadow-md px-3 py-2">
  <a href="/" class="flex items-center gap-2 px-3">
    <svg class="w-5 h-5"><!-- aptos mark --></svg>
    <span class="font-serif text-base">Aptos</span>
  </a>

  <nav aria-label="Main navigation">
    <ul role="menubar" class="flex h-full gap-5">
      <li role="none">
        <button role="menuitem" aria-haspopup="true" aria-expanded="false"
                class="group flex h-full items-center
                       border-b border-transparent
                       transition-colors
                       aria-expanded:border-b-current
                       font-mono text-xs uppercase tracking-wider">
          About
          <svg class="ml-1 w-3 h-3 transition-transform
                      group-aria-expanded:rotate-180"><!-- chevron --></svg>
        </button>
        <nav role="menu" class="absolute top-full left-0 mt-2
                                opacity-0 scale-95
                                data-[state=open]:opacity-100 data-[state=open]:scale-100
                                transition-all duration-150
                                bg-surface-100 rounded-lg shadow-lg p-4">
          <!-- nested links -->
        </nav>
      </li>
      <!-- Ecosystem, Build … -->
    </ul>
  </nav>

  <a class="rounded-full bg-black text-surface-100
            font-mono text-xs uppercase tracking-wider
            px-5 py-2">
    Get Started
  </a>
</header>
```

---

## Primary Button (Pill CTA)

### 结构说明
- 单标签 `<a>` 或 `<button>`
- 形态：完全胶囊化 `border-radius: 9999px`
- 内部：纯文字 `font-mono uppercase`，无图标

### 状态
| 状态 | 视觉变化 |
| --- | --- |
| default | `bg #0F0E0B`、`color #F9F9F0` |
| hover | `opacity: 0.88` 或切换到 `bg: #2F2D28` |
| active | `transform: scale(0.98)` |
| focus-visible | `outline: 2px solid #0F0E0B; outline-offset: 3px` |
| disabled | `opacity: 0.4; cursor: not-allowed` |

### Token 对应
- bg → `inverted-100` (黑)
- text → `surface-100` (暖白)
- radius → `radius-pill`
- font → `font-mono text-xs uppercase tracking-[0.03em]`
- transition → `duration-fast ease-standard`

### 示例 HTML
```html
<a href="/get-started"
   class="inline-flex items-center justify-center
          rounded-full bg-black text-[#F9F9F0]
          font-mono text-xs uppercase tracking-wider
          px-6 py-3
          transition-opacity duration-150
          hover:opacity-88 active:scale-[0.98]
          focus-visible:outline focus-visible:outline-2
          focus-visible:outline-offset-2">
  Get Started
</a>
```

---

## Content Card (Image + Text)

### 结构说明
- 双栏布局：左 1/2 文字 + 右 1/2 图像（桌面）
- 移动端：上下堆叠
- 图像默认应用饱和度降低或灰度滤镜 → 与暖中性主题协调

### 状态
- default
- hover（仅当整块可点击）：图像 `filter: grayscale(0)` 还原彩色

### Token 对应
- gap：`spacing-xl (80px)`
- title：`text-3xl font-serif`
- body：`text-base text-muted`
- image radius：`radius-lg (12px)`

### 示例 HTML
```html
<section class="grid md:grid-cols-2 gap-20 items-center
                container max-w-[64rem] mx-auto py-20">
  <div class="space-y-4">
    <h2 class="font-serif text-4xl leading-tight tracking-tight">
      Discover what's being built
    </h2>
    <p class="text-base text-black/70 max-w-md">
      Explore 330+ projects on Aptos: delivering real impact,
      serving real users, and moving real value every day.
    </p>
    <a class="inline-flex … pill-btn">Explore</a>
  </div>

  <div class="relative aspect-[4/3] overflow-hidden rounded-xl">
    <img src="…" class="object-cover w-full h-full
                        grayscale-[0.6] hover:grayscale-0
                        transition-all duration-500" />
  </div>
</section>
```

---

## Stackable Card (滚动堆叠)

### 结构说明
- 一组同高 card 在垂直滚动中依次堆叠
- 后一张卡片滚动到屏幕时，前一张通过 `stackable-shrink` 动画缩小到 0.8
- 实现完全基于 **CSS scroll-driven animation**，无 IntersectionObserver

### 关键 CSS
```css
.stack-card {
  position: sticky;
  top: 80px;
  border-radius: 24px;
  background: var(--surface-200);
  padding: 60px 40px;
  animation-timeline: view();
  animation-name: stackable-shrink;
  animation-range: exit 0% exit 100%;
  animation-fill-mode: forwards;
}

@keyframes stackable-shrink {
  0%   { scale: 1; }
  100% { scale: 0.8; }
}
```

### Token 对应
- bg → `surface-200`
- radius → `radius-xl (24px)`
- duration → 由 scroll-timeline 接管
- easing → `ease-text-mask` 推荐

---

## Marquee Strip (横向滚动品牌墙)

### 结构说明
- 两侧带 `mask-image` 软淡出
- 内容重复两遍以实现无缝循环
- 速度恒定，hover 暂停

### 示例 HTML
```html
<div class="rfm-marquee-container relative overflow-hidden
            [mask-image:linear-gradient(to_right,transparent,black_8%,black_92%,transparent)]">
  <div class="rfm-marquee flex gap-12 whitespace-nowrap
              [animation:marquee-rtl_30s_linear_infinite]">
    <span class="font-mono uppercase">PARTNER 1</span>
    <span class="font-mono uppercase">PARTNER 2</span>
    <!-- … 重复 -->
  </div>
</div>
```

---

## Accordion (Disclosure)

### 结构说明
- 使用原生 `<details>` + `<summary>`，零 JS
- summary 内置 chevron，使用 `details[open]` CSS 旋转

### 状态
- closed：chevron 默认朝下
- open：chevron 90° 旋转，下方内容展开

### 示例 HTML
```html
<details class="group border-b border-black/10 py-5">
  <summary class="flex items-center justify-between cursor-pointer
                  font-serif text-xl
                  marker:hidden list-none">
    What is Aptos?
    <svg class="w-5 h-5 transition-transform duration-300
                group-open:rotate-180"><!-- chevron --></svg>
  </summary>
  <div class="mt-3 text-base text-black/70">
    Aptos is a Layer-1 blockchain …
  </div>
</details>
```

---

## Theme Toggle Pill

### 结构说明
- 三选一胶囊切换器：`SYSTEM` / `LIGHT` / `DARK`
- 容器是 pill；每个选项是 pill 内嵌的小 pill
- 选中态：实心黑底白字

### 示例 HTML
```html
<div role="radiogroup" aria-label="Theme"
     class="inline-flex items-center gap-1 rounded-full
            bg-surface-100 border border-black/10 p-1">
  <button role="radio" aria-checked="true"
          class="flex items-center gap-2 px-4 py-2 rounded-full
                 font-mono text-xs uppercase tracking-wider
                 aria-checked:bg-black aria-checked:text-[#F9F9F0]">
    <svg class="w-3 h-3"><!-- system icon --></svg> System
  </button>
  <button role="radio" aria-checked="false"
          class="flex items-center gap-2 px-4 py-2 rounded-full
                 font-mono text-xs uppercase tracking-wider
                 aria-checked:bg-black aria-checked:text-[#F9F9F0]">
    Light
  </button>
  <button role="radio" aria-checked="false"
          class="flex items-center gap-2 px-4 py-2 rounded-full
                 font-mono text-xs uppercase tracking-wider
                 aria-checked:bg-black aria-checked:text-[#F9F9F0]">
    Dark
  </button>
</div>
```

---

## Footer

### 结构说明
- 三段：顶部 `MANAGED BY / Aptos Foundation` + 主题切换 → 中部 newsletter + 链接列表 → 底部版权
- 链接列表标题使用 `font-mono text-xs uppercase`，链接本身用 `font-serif text-base`
- 外链以 `↗` 字符标识

### 示例 HTML（简化）
```html
<footer class="bg-surface-100 border-t border-black/10 px-6 py-12">
  <div class="container mx-auto max-w-[110rem]">
    <div class="flex items-center justify-between mb-12">
      <div>
        <p class="font-mono text-xs uppercase tracking-wider text-black/60">
          Managed by
        </p>
        <a class="font-serif text-xl">Aptos Foundation</a>
      </div>
      <!-- Theme toggle pill 见上 -->
    </div>

    <div class="grid grid-cols-1 md:grid-cols-4 gap-8">
      <section>
        <p class="font-mono text-xs uppercase text-black/60">Newsletter</p>
        <h3 class="font-serif text-2xl my-3">
          Subscribe to our mailing list
        </h3>
        <button class="w-10 h-10 rounded-full border border-black/30
                       flex items-center justify-center">→</button>
      </section>

      <nav>
        <h4 class="font-mono text-xs uppercase text-black/60 mb-3">Build on Aptos</h4>
        <ul class="space-y-2 font-serif">
          <li><a>Dev Docs ↗</a></li>
          <li><a>Github ↗</a></li>
          <li><a>Grants</a></li>
          <!-- … -->
        </ul>
      </nav>
      <!-- 重复两次 -->
    </div>
  </div>
</footer>
```

---

## Toast / Notification

### 结构说明
- 提取到但页面上未实际展开 —— Aptos 用其做 cookie / 公告条
- 推测结构：底部固定，带关闭按钮，圆角 12px

### Token 对应
- bg → `surface-200` 或 `accent-coral`
- radius → `radius-lg`
- shadow → `shadow-lg`
- animation → `appear-mask-in-from-right`

### 示例 HTML
```html
<div role="status"
     class="fixed bottom-6 right-6 max-w-md
            rounded-xl bg-surface-200 border border-black/10
            shadow-lg p-4
            flex items-start gap-3
            animate-[appear-mask-in-from-right_0.5s_cubic-bezier(0.76,0,0.24,1)_forwards]">
  <p class="font-serif text-base flex-1">
    We use cookies to enhance your experience.
  </p>
  <button aria-label="Dismiss" class="font-mono text-xs uppercase">
    Dismiss
  </button>
</div>
```
