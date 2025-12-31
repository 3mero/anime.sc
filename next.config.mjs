/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'cdn.myanimelist.net',
      },
      {
        protocol: 'https',
        hostname: 'picsum.photos',
      },
      {
        protocol: 'https',
        hostname: '**.anilist.co',
      },
      {
        protocol: 'https',
        hostname: 'trace.moe',
      },
      {
        protocol: 'https',
        hostname: 'api.trace.moe',
      },
      {
        protocol: 'https',
        hostname: 'avatar.vercel.sh',
      },
    ],
    deviceSizes: [640, 1200],
    imageSizes: [64, 128, 256],
    unoptimized: true,
  },
  experimental: {
    optimizePackageImports: ['lucide-react', '@radix-ui/react-icons'],
  },
}

export default nextConfig
