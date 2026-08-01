/** @type {import('next').NextConfig} */
const nextConfig = {
  // @basin/contracts ships TypeScript source, compiled by the app build.
  transpilePackages: ["@basin/contracts"],
  experimental: {
    typedRoutes: true,
  },
};

export default nextConfig;
