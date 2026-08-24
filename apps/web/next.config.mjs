/** @type {import('next').NextConfig} */
const nextConfig = {
  // @basin/contracts ships TypeScript source, compiled by the app build.
  transpilePackages: ["@basin/contracts"],
  experimental: {
    typedRoutes: true,
  },
  // IA v2 (docs/IA.md): topic tabs became report chapters; split pages
  // redirect to the chapter, which links its sibling instrument up top.
  redirects: async () => [
    { source: "/markets", destination: "/report/water-rights", permanent: true },
    { source: "/supply", destination: "/report/supply", permanent: true },
    { source: "/demand", destination: "/report/demand", permanent: true },
    { source: "/reservoirs", destination: "/report/reservoirs", permanent: true },
    { source: "/distribution", destination: "/report/distribution", permanent: true },
    { source: "/water-rights", destination: "/report/water-rights", permanent: true },
    { source: "/infrastructure", destination: "/report/infrastructure", permanent: true },
    { source: "/agriculture", destination: "/report/agriculture", permanent: true },
    { source: "/now", destination: "/current-state", permanent: true },
  ],
};

export default nextConfig;
