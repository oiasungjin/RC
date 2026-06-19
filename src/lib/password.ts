// 비밀번호 정책 — 클라이언트(회원가입 폼)와 서버(라우트 핸들러)가 함께 쓰는 단일 출처.
// 규칙: 8자 이상 + 숫자 포함 + 특수문자(영문·숫자가 아닌 문자) 포함.
// 'use client' 를 붙이지 않아 서버 코드에서도 import 가능하다.

export const PW_RULES = [
  { key: 'len', label: '8자 이상', test: (p: string) => p.length >= 8 },
  { key: 'num', label: '숫자 포함', test: (p: string) => /[0-9]/.test(p) },
  { key: 'special', label: '특수문자 포함', test: (p: string) => /[^A-Za-z0-9]/.test(p) },
] as const;

// 충족하지 못한 규칙의 라벨 목록(빈 배열이면 통과).
export function passwordIssues(pw: string): string[] {
  return PW_RULES.filter((r) => !r.test(pw)).map((r) => r.label);
}

export function isPasswordValid(pw: string): boolean {
  return passwordIssues(pw).length === 0;
}
