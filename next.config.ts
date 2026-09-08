import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Vinext checks multipart bodies before dispatching route handlers. Keep
  // that ceiling above our upload route's stricter 12 MB file limit.
  experimental: { serverActions: { bodySizeLimit: '13mb' } },
};

export default nextConfig;
