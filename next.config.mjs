/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Anthropic SDK는 서버에서 require로 로드 — webpack 번들에 포함시키지 않는다.
  // (라우트 워커에 통째로 번들하다 워커가 크래시하는 문제 방지)
  serverExternalPackages: ['@anthropic-ai/sdk'],
};
export default nextConfig;
