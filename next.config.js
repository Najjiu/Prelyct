/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  
  // Performance optimizations
  swcMinify: true,
  compress: true,
  
  // Image optimization
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },
  
  // Rewrites to hide .html extension from URLs
  async rewrites() {
    return [
      {
        source: '/index.html',
        destination: '/',
      },
      {
        source: '/contact',
        destination: '/contact.html',
      },
      {
        source: '/about',
        destination: '/about.html',
      },
      {
        source: '/our-work',
        destination: '/our-work.html',
      },
      {
        source: '/soleva-votes',
        destination: '/soleva-votes.html',
      },
      {
        source: '/soleva-hostels',
        destination: '/soleva-hostels.html',
      },
      {
        source: '/web-development',
        destination: '/web-development.html',
      },
      {
        source: '/graphic-design',
        destination: '/graphic-design.html',
      },
      {
        source: '/ms-suite-services',
        destination: '/ms-suite-services.html',
      },
      {
        source: '/privacy-policy',
        destination: '/privacy-policy.html',
      },
      {
        source: '/terms-of-service',
        destination: '/terms-of-service.html',
      },
    ]
  },

  // Experimental features for better performance
  // Serve static files from root
  async headers() {
    return [
      {
        source: '/:path*.html',
        headers: [
          {
            key: 'Content-Type',
            value: 'text/html',
          },
        ],
      },
      {
        // Cache static assets
        source: '/:path*.(jpg|jpeg|png|gif|ico|svg|woff|woff2|ttf|eot)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        // Cache API responses
        source: '/api/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, s-maxage=60, stale-while-revalidate=300',
          },
        ],
      },
    ]
  },
}

module.exports = nextConfig

