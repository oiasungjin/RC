import type { MetadataRoute } from 'next';

// PWA/TWA 매니페스트. Next App Router가 /manifest.webmanifest로 서빙하고 <link rel="manifest">를 자동 주입.
// theme/background = 흰색(Apple 화이트 캔버스). 설치 시 스플래시·상태바 색으로 사용됨.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: '므네모 — 어휘 라이프로그',
    short_name: '므네모',
    description:
      '떠올리기 어려웠던 단어를 가볍게 기록하고, 같은 분류의 단어로 되짚어 보는 생활밀착형 어휘 기록 앱.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    lang: 'ko',
    background_color: '#ffffff',
    theme_color: '#ffffff',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
