/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['financialmodelingprep.com'],
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
}

module.exports = nextConfig
