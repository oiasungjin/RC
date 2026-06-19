import type { Metadata, Viewport } from 'next';
import './globals.css';
import Link from 'next/link';
import AuthBadge from '@/components/AuthBadge';
import SyncBootstrap from '@/components/SyncBootstrap';
import AppFooter from '@/components/AppFooter';
import AppNav from '@/components/AppNav';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import { LanguageProvider } from '@/lib/i18n';

export const metadata: Metadata = {
  // 사용목적(웰니스/생활기록) 톤 유지 — 진단·예측·선별·치료를 암시하는 표현 사용 금지.
  // 근거: docs/regulatory/intended-use.md
  title: '므네모 — 떠오르지 않는 단어를 기록하는 어휘 라이프로그',
  description:
    '떠올리기 어려웠던 단어를 가볍게 기록하고, 같은 분류의 단어 10개로 되짚어 보는 생활밀착형 어휘 기록 앱입니다. 의료 진단·검사 도구가 아닙니다.',
};
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#ffffff', // 모바일 브라우저/설치앱 상태바 색 — 화이트 캔버스와 일치
};

// 기억의 파동 — 중심점에서 퍼지는 아치 3겹. (Apple: 모노톤 잉크 + 단일 Action Blue)
function MnemoMark() {
  return (
    <svg
      width="32"
      height="32"
      viewBox="0 0 36 36"
      fill="none"
      aria-hidden="true"
      className="shrink-0"
    >
      {/* 외곽 원 — 헤어라인 */}
      <circle cx="18" cy="18" r="16" stroke="#d2d2d7" strokeWidth="1" />
      {/* 중간 아치 — 잉크 */}
      <path
        d="M 6 18 A 12 12 0 0 1 30 18"
        stroke="#1d1d1f"
        strokeWidth="2"
        strokeLinecap="round"
      />
      {/* 안쪽 작은 아치 — Action Blue */}
      <path
        d="M 11 18 A 7 7 0 0 1 25 18"
        stroke="#0066cc"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      {/* 중심점 */}
      <circle cx="18" cy="18" r="1.8" fill="#0066cc" />
    </svg>
  );
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <body className="min-h-screen" suppressHydrationWarning>
        <LanguageProvider>
          <SyncBootstrap />
          <header className="sticky top-0 z-40 border-b border-hairline/70 bg-parchment/80 backdrop-blur-nav supports-[backdrop-filter]:bg-parchment/70">
            <div className="mx-auto flex max-w-lg items-center justify-between gap-2 px-4 pb-2 pt-3">
              <Link href="/" className="group flex min-w-0 flex-1 items-center gap-2.5">
                <MnemoMark />
                <span className="truncate font-display text-[19px] font-semibold tracking-[-0.022em] text-ink transition-colors group-hover:text-accent">
                  므네모
                </span>
              </Link>
              <div className="flex shrink-0 items-center gap-1.5 text-xs text-slate-500">
                <LanguageSwitcher />
                <AuthBadge />
              </div>
            </div>
            <AppNav />
          </header>
          <main className="mx-auto max-w-lg px-4 pb-8 pt-4">{children}</main>
          <AppFooter />
        </LanguageProvider>
      </body>
    </html>
  );
}
