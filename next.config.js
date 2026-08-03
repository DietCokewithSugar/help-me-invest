/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['financialmodelingprep.com'],
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  // 自建部署（Render / Docker）时设 BUILD_STANDALONE=1，产出可直接 `node server.js` 运行的独立包。
  // 不设则完全保持原样，Vercel 构建不受影响。
  ...(process.env.BUILD_STANDALONE === '1' ? { output: 'standalone' } : {}),
}

module.exports = nextConfig
