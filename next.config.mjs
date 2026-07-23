/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    staleTimes: {
      dynamic: 0,
    },
    serverActionsBodySizeLimit: '15mb',
  },
};

export default nextConfig;
