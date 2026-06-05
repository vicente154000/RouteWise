/** @type {import('next').NextConfig} */
const nextConfig = {
  // next/image optimizer requires a server; disable for static export
  images: {
    unoptimized: true,
  },
};

// When DEPLOY_TARGET=github-pages, configure for static export
// Used by .github/workflows/deploy.yml
if (process.env.DEPLOY_TARGET === "github-pages") {
  nextConfig.output = "export";
  nextConfig.basePath = "/RouteWise";
  nextConfig.assetPrefix = "/RouteWise/";
}

export default nextConfig;
