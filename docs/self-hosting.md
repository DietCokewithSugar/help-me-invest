# 自建部署（Render / Docker）

站点原本部署在 Vercel，代码现在同时可以在任意长驻 Node 环境跑起来。Vercel 那条路径没有任何改动，本文只描述自建所需的额外步骤。

## 构建产物

`next.config.js` 里的 `output: 'standalone'` 由环境变量 `BUILD_STANDALONE=1` 触发。不设这个变量时配置与从前完全一致，因此 Vercel 构建不受影响。

本地验证：

```bash
BUILD_STANDALONE=1 npm run build
node .next/standalone/server.js
```

`.next/standalone` 不包含静态资源，直接跑之前需要把 `.next/static` 和 `public` 复制进去——`Dockerfile` 里已经做了这件事。

## Render

两种方式二选一：

**Docker（推荐）** — 新建 Web Service，Environment 选 Docker，仓库根目录的 `Dockerfile` 会被自动识别。注意 `NEXT_PUBLIC_*` 变量会被编译进前端产物，必须作为 build args 在构建期提供，Dockerfile 已声明对应的 `ARG`。

**原生 Node** — Build Command `BUILD_STANDALONE=1 npm ci && npm run build`，Start Command `node .next/standalone/server.js`（同样需要先把静态资源复制到位，用 Docker 会省事很多）。

### 环境变量

把 `.env.example` 里的变量配到 Render 的 Environment 里。必需的是 `NEXT_PUBLIC_SITE_URL`、`FMP_API_KEY`、`DEEPSEEK_API_KEY`、`NEXT_PUBLIC_SUPABASE_URL`、`SUPABASE_SERVICE_ROLE_KEY`。DeepSeek 的其余变量都有默认值，可以不配。

## 与 Vercel 的行为差异

**请求时长上限放开了。** 各 API 路由里的 `export const maxDuration` 只对 Vercel 生效，在 Render 上是无害的惰性导出，不用删。Render 单个请求可以跑到 100 分钟，而 Vercel 的上限是 300 秒——`/api/ai/stream-section` 生成长报告时不再有超时风险。

**限流器第一次真正生效。** `src/lib/ai/rate-limiter.ts` 和 `src/lib/api-security.ts` 里的限流状态都存在模块作用域，也就是「每进程」。Vercel 上每个 lambda 实例各有一份，约束不到账号级并发；Render 上是单个长驻进程，才构成真正的全局上限。相应地 `DEEPSEEK_MAX_CONCURRENT` 默认的 2 可能偏紧，可以按实际情况调大。如果 Render 服务扩到多实例，这两处又会退回每实例各自计数，届时需要换成 Redis 之类的共享存储。

**免费套餐会休眠。** Render 免费实例闲置约 15 分钟后停机，下一个请求要等冷启动（可能接近一分钟）。另外部署替换实例时，正在进行的流式响应会断开——前端的报告页需要用户重新触发。

`/api/ai/stream-section` 里「保存完成后再关闭流」那段（先 `await saveReportSection` 再 `controller.close()`）在自建环境下不是必需的，但保留着也没有代价，且迁回 Vercel 时仍然需要它。

## 出站代理

Next 14 的 `fetch` 基于 undici，**不认 `HTTPS_PROXY` 环境变量**。如果自建环境必须走出站代理，需要给 `src/lib/ai/deepseek-request.ts` 的 `fetch` 传 `dispatcher`（undici 的 `ProxyAgent`）——所有 DeepSeek 请求都收敛在那一个函数里，改一处即可。
