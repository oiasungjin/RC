// 법적 고지 문서(이용약관·개인정보처리방침·면책조항)의 데이터 형태.
// 짧은 UI 문자열용 i18n 사전과 분리해, 장문 법률 텍스트는 여기 데이터로 관리한다.
// 본문 한 줄이 '· '로 시작하면 뷰에서 들여쓰기 항목으로 렌더된다.

import type { Language } from '@/lib/i18n';

export interface LegalSection {
  heading: string;
  body: string[];
}

export interface LegalDoc {
  title: string;
  updated: string; // 예: "시행일 2026-06-24"
  intro?: string;
  sections: LegalSection[];
}

export type LegalContent = Record<Language, LegalDoc>;

// 사업자 정보 — 〔…〕 표시는 게시 전 반드시 확정해야 하는 빈칸.
export const COMPANY = {
  service: '므네모(Mnemo) · 렉시케어(Lexicare)',
  nameKo: '플랜비포유 주식회사',
  nameEn: 'PlanB4U Inc.',
  email: 'planb4u@planb4u.kr',
  rep: '〔대표자명 확인 필요〕',
  bizNo: '〔사업자등록번호 확인 필요〕',
  addr: '〔사업장 주소 확인 필요〕',
  officer: '〔개인정보 보호책임자명 확인 필요〕',
  effective: '2026-06-24',
} as const;
