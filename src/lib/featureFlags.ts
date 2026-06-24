'use client';

// 기능 공개 게이트 — 미완성 기능을 일반 사용자에겐 가리고, 개발자는 계속 보면서 개발.
// 다음 중 하나라도 참이면 진짜 화면을 연다:
//   (1) 전체공개 스위치  NEXT_PUBLIC_COGNITION_ENABLED=true  (완성 시 이것만 켜면 전원 공개)
//   (2) 로컬 개발 모드    npm run dev  (내 PC에서는 항상 열림)
//   (3) 관리자 로그인     로그인 이메일 == NEXT_PUBLIC_ADMIN_EMAIL  (배포본에서도 나만 봄)
// 공개(NEXT_PUBLIC_) 환경변수만 사용 — 빌드시 치환되어 클라이언트에서 안전.

import { useAuthStatus } from './useAuthStatus';

const COGNITION_ENABLED = process.env.NEXT_PUBLIC_COGNITION_ENABLED === 'true';
const IS_DEV = process.env.NODE_ENV === 'development';
const ADMIN_EMAIL = (process.env.NEXT_PUBLIC_ADMIN_EMAIL ?? '').toLowerCase().trim();

export interface FeatureGate {
  loading: boolean; // 판정 진행 중(관리자 확인 대기) — 깜빡임 방지용
  allowed: boolean; // 진짜 화면을 보여줄지
}

// 인지근육 화면 접근 게이트. 컴포넌트 최상단에서 호출.
export function useCognitionGate(): FeatureGate {
  const { loading, email } = useAuthStatus();

  // 전체공개거나 로컬 개발이면 로그인 확인 없이 즉시 통과.
  if (COGNITION_ENABLED || IS_DEV) {
    return { loading: false, allowed: true };
  }

  // 관리자 판정은 로그인 이메일 확인이 끝나야 확정.
  const isAdmin = ADMIN_EMAIL !== '' && (email ?? '').toLowerCase() === ADMIN_EMAIL;
  return { loading, allowed: isAdmin };
}

// 네비게이션 '준비중' 배지 노출 여부 — 전체공개 전까지 표시.
export function showCognitionSoonBadge(): boolean {
  return !COGNITION_ENABLED;
}
