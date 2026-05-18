# Aptos Network — Color Palette

源站：`https://aptosnetwork.com`
提取时间：2026-05-18

Aptos 的配色由两条主线构成：
1. **暖中性主色板（cream → ink）**——一组温暖偏黄的灰阶，承担 99% 的背景与文字。
2. **三色高纯度强调色（mint / blue / coral）**——只在 hero、分区背景、按钮 hover、小图形上出现，作为情感锚点。

---

## 1. 原始色板

| 色块 | Token | HEX | RGB | 用途 |
| --- | --- | --- | --- | --- |
| ⬜ | `pure-white` | `#FFFFFA` | 255, 255, 250 | 极少使用，纯净对比 |
| 🟫 | `white` | `#F9F9F0` | 249, 249, 240 | **页面默认背景（暖白）** |
| 🟨 | `cream` | `#EFECCA` | 239, 236, 202 | 二级背景 / 区块分隔色带 |
| 🟫 | `sand` | `#CCC5A3` | 204, 197, 163 | 三级背景 / 大图遮罩 |
| 🟫 | `tan` | `#9D937C` | 157, 147, 124 | 中性灰 / 暗模式辅助色 |
| ⬛ | `ash` | `#3D3B34` | 61, 59, 52 | 次级文字 / 暗模式中度背景 |
| ⬛ | `graphite` | `#2F2D28` | 47, 45, 40 | 暗模式 hover bg |
| ⬛ | `coal` | `#21201C` | 33, 32, 28 | 暗模式卡片表面 |
| ⬛ | `ink` | `#171612` | 23, 22, 18 | 暗模式二级背景 |
| ⬛ | `black` | `#0F0E0B` | 15, 14, 11 | **页面主文字 / 暗模式主背景** |
| 🟩 | `mint` | `#D5FAD3` | 213, 250, 211 | **首屏 hero 背景**（高识别度） |
| 🟦 | `blue` | `#BADBEE` | 186, 219, 238 | 信息分区 / 代码栏背景 |
| 🟧 | `coral` | `#FF8866` | 255, 136, 102 | 强调按钮 / 提示点缀 |

> **核心识别色**：mint `#D5FAD3` + black `#0F0E0B` 的对比是 Aptos 最具辨识度的视觉签名。

---

## 2. 语义映射（Light / Dark 双模式）

CSS 通过 `light-dark()` 函数声明，浏览器根据 `color-scheme` 自动切换。

| Semantic Token | Light | Dark | 用途 |
| --- | --- | --- | --- |
| `surface-100` | `#F9F9F0` | `#0F0E0B` | 页面主背景 |
| `surface-200` | `#EFECCA` | `#171612` | 卡片 / 区块底 |
| `surface-300` | `#CCC5A3` | `#21201C` | 凸起元素 |
| `surface-400` | `#9D937C` | `#3D3B34` | 分割线条 / muted bg |
| `inverted-100` | `#0F0E0B` | `#F9F9F0` | 反色文字 |
| `inverted-200` | `#171612` | `#EFECCA` | 反色二级 |
| `accent-mint` | `#D5FAD3` | `#D5FAD3` | Hero 背景（保持饱和） |
| `accent-blue` | `#BADBEE` | `#BADBEE` | 信息背景 |
| `accent-coral` | `#FF8866` | `#FF8866` | CTA 强调 |
| `border` | `rgba(0,0,0,0.15)` | `rgba(255,255,255,0.15)` | 通用 1px 描边 |
| `success` | `#166534` | `#68D391` | 成功状态 |
| `error` | `#C53030` | `#FC8181` | 错误状态 |

---

## 3. 颜色使用规则

### ✅ 推荐
- 大面积 hero 区使用 **mint** 或 **blue** 单色平铺，搭配 black 文字
- 正文页面背景使用 `white #F9F9F0`，而非 `pure-white`，保留温度感
- 主按钮使用 `black #0F0E0B` 实心填充，文字用 `white`
- 描边一律使用半透明色（`rgba(0,0,0,0.15)`），不要使用 `tan` 或 `sand` 作硬描边

### ❌ 避免
- 不要在同一屏出现两种高饱和强调色（mint + blue + coral）
- 不要将 `cream` 用作正文（对比度不足）
- 不要使用渐变背景（Aptos 全站零渐变）
- 不要为按钮添加深色阴影；最多使用 `shadow-sm`

---

## 4. 颜色组合示例

| 场景 | 背景 | 主文字 | 装饰 |
| --- | --- | --- | --- |
| Hero 首屏 | `mint #D5FAD3` | `black #0F0E0B` | 黑色 Pill CTA + 黑蓝条纹 |
| 内容分区 A | `white #F9F9F0` | `black` | 黑白人像照片 |
| 信息卡片 | `blue #BADBEE` | `black` | mono 字体代码片段 |
| Footer | `white` | `ash #3D3B34` | `border rgba(0,0,0,0.1)` |
| 暗模式 hero | `coal #21201C` | `white #F9F9F0` | mint 高亮 |

---

## 5. Light vs Dark 模式对照

```
Light Mode (默认)
├─ Background  #F9F9F0  ← 暖奶油白
├─ Text        #0F0E0B  ← 近黑（带 #11 红）
├─ Card        #EFECCA  ← 米黄
└─ Accent      #D5FAD3 / #BADBEE / #FF8866

Dark Mode
├─ Background  #0F0E0B  ← 近黑
├─ Text        #F9F9F0  ← 暖奶油白
├─ Card        #171612  ← 油墨黑
└─ Accent      （保持原色，三色不反转）
```

强调色 `mint / blue / coral` 在暗模式下**不反转**，目的是保持品牌识别一致性。
