import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    dangerouslyAllowLocalIP: true,
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '4000',
        pathname: '/uploads/**', // product images served by the backend
      },
      // TODO: add your production API/image domain, e.g.
      // { protocol: 'https', hostname: 'api.your-domain.com', pathname: '/uploads/**' },
    ],
  },
}

export default nextConfig
