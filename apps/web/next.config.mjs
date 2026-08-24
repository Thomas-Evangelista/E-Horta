/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@e-horta/types', '@e-horta/validation'],
  images: {
    remotePatterns: [{ protocol: 'https', hostname: '**' }],
  },
};

export default nextConfig;
