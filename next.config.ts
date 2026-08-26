import type { NextConfig } from 'next';

const repositoryName = process.env.GITHUB_REPOSITORY?.split('/')[1] ?? '';
const repositoryOwner = process.env.GITHUB_REPOSITORY?.split('/')[0] ?? '';
const isUserSite = repositoryName.endsWith('.github.io');
const pagesBasePath = process.env.GITHUB_ACTIONS === 'true' && repositoryName && !isUserSite
  ? `/${repositoryName}`
  : '';

const nextConfig: NextConfig = {
  output: 'export',
  trailingSlash: true,
  basePath: pagesBasePath,
  assetPrefix: pagesBasePath,
  images: { unoptimized: true },
  env: {
    NEXT_PUBLIC_BASE_PATH: pagesBasePath,
    NEXT_PUBLIC_SITE_URL: process.env.GITHUB_ACTIONS === 'true' && repositoryOwner
      ? `https://${repositoryOwner.toLowerCase()}.github.io${pagesBasePath}`
      : 'https://houtlijst-pdf-naar-csv.arthurtichem.chatgpt.site',
  },
};

export default nextConfig;
