'use client';

// 로그아웃 — 서버 라우트가 Supabase 쿠키를 제거하기 전에 클라이언트의 localStorage도 같이 비운다.
// 그렇지 않으면 다른 사용자로 다시 로그인했을 때 이전 사용자의 단어가 그대로 보이는 문제 발생.

import { useState } from 'react';

// storage.ts와 sync.ts에서 사용하는 키 — 변경 시 두 곳을 같이 맞춰야 한다.
const LOCAL_KEYS = ['wk.vocab.v1', 'wk.sessions.v1', 'wk.history.v1'];
const SESSION_KEYS = ['wk.lastSync'];

export function clearLocalUserData() {
  if (typeof window === 'undefined') return;
  for (const k of LOCAL_KEYS) window.localStorage.removeItem(k);
  for (const k of SESSION_KEYS) window.sessionStorage.removeItem(k);
}

export default function LogoutButton() {
  const [pending, setPending] = useState(false);

  async function onClick() {
    setPending(true);
    clearLocalUserData();
    try {
      // 서버 라우트가 쿠키를 정리한다. redirect는 따로 받지 않고 우리가 full reload 시킨다.
      await fetch('/auth/signout', { method: 'POST', redirect: 'manual' });
    } catch {
      /* 쿠키 정리 실패해도 어차피 클라이언트는 새로고침으로 빈 상태 표시 */
    }
    // router.refresh()는 client 컴포넌트의 useEffect를 재실행하지 못한다.
    // 대시보드 vocab state를 확실히 초기화하려면 full page reload가 가장 안전.
    window.location.href = '/';
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      className="text-slate-500 hover:text-accent transition-colors whitespace-nowrap disabled:opacity-50"
    >
      {pending ? '로그아웃 중…' : '로그아웃'}
    </button>
  );
}
