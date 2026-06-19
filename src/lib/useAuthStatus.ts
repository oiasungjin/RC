'use client';

// 클라이언트에서 현재 로그인 상태를 반응형으로 알려주는 훅.
// - configured: Supabase가 설정돼 있는지(미설정이면 순수 로컬 게스트 모드 — 기록 차단 안 함)
// - loading: 아직 세션 확인 중
// - loggedIn / email: 로그인 여부와 계정
// onAuthStateChange 구독으로 로그인/로그아웃에 즉시 반응한다.

import { useEffect, useState } from 'react';
import { createClient, isSupabaseConfigured } from './supabase/client';

export interface AuthStatus {
  configured: boolean;
  loading: boolean;
  loggedIn: boolean;
  email: string | null;
}

export function useAuthStatus(): AuthStatus {
  const configured = isSupabaseConfigured();
  const [state, setState] = useState<AuthStatus>({
    configured,
    loading: configured, // 미설정이면 확인할 게 없으니 loading=false
    loggedIn: false,
    email: null,
  });

  useEffect(() => {
    if (!configured) return;
    let cancelled = false;
    const supabase = createClient();

    supabase.auth
      .getUser()
      .then(({ data }) => {
        if (cancelled) return;
        setState({ configured, loading: false, loggedIn: !!data.user, email: data.user?.email ?? null });
      })
      .catch(() => {
        if (!cancelled) setState({ configured, loading: false, loggedIn: false, email: null });
      });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setState({
        configured,
        loading: false,
        loggedIn: !!session?.user,
        email: session?.user?.email ?? null,
      });
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, [configured]);

  return state;
}
