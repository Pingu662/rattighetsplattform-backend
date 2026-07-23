/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { hostname: 'localhost' },
      { hostname: 'rattighetsplattform-backend-production.up.railway.app' },
    ],
  },
  output: 'export',
  trailingSlash: true,
  skipMiddlewareUrlNormalize: true,
}

module.exports = nextConfig
