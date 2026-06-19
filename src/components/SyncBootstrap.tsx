'use client';

// 로그인 상태에서 페이지가 처음 로드될 때 1회: 로컬 → 서버 push, 서버 → 로컬 pull.
// 가입/로그인 페이지의 명시적 push가 어떤 이유로 실패해도 이게 안전망 역할.
// 같은 탭에서는 sessionStorage 플래그로 중복 방지.
// 로그아웃(다른 탭, 토큰 만료, 페이지 직접 진입 포함) 감지 시 localStorage의 사용자 데이터도 비운다.

import { useEffect } from 'react';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { clearLocalUserData } from './LogoutButton';

const KEY = 'wk.lastSync';
// 가장 최근에 로그인했었던 사용자 id를 기록 — 페이지가 새로 열렸을 때 "이전엔 로그인이었는데 지금 아니면" 잔존 데이터 정리 트리거.
const OWNER_KEY = 'wk.session.uid';
const COOLDOWN_MS = 30 * 1000;

function reloadIfDashboard() {
  // 단순 정리만으로는 마운트된 HomePage의 vocab state가 안 바뀐다. 대시보드/기록 화면 같은 listing은 새로고침.
  if (typeof window === 'undefined') return;
  const p = window.location.pathname;
  if (p === '/' || p.startsWith('/record') || p.startsWith('/train') || p.startsWith('/result')) {
    window.location.reload();
  }
}

export default function SyncBootstrap() {
  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    let cancelled = false;

    async function bootstrap() {
      try {
        const supabase = createClient();
        const { data } = await supabase.auth.getUser();
        if (cancelled) return;

        const prevOwner = window.localStorage.getItem(OWNER_KEY);

        if (!data.user) {
          // 이전에 로그인 상태였던 흔적이 있는데 지금은 아니면 → 이 탭이 새로 열린 직후의 stale state.
          // 잔존 데이터를 비우고 한 번 새로고침해서 UI를 깨끗하게 만든다.
          if (prevOwner) {
            clearLocalUserData();
            window.localStorage.removeItem(OWNER_KEY);
            reloadIfDashboard();
          }
          return;
        }

        // 다른 사용자로 바뀌었으면 이전 캐시는 그 사용자 것이므로 폐기.
        if (prevOwner && prevOwner !== data.user.id) {
          clearLocalUserData();
        }
        window.localStorage.setItem(OWNER_KEY, data.user.id);

        const last = Number(window.sessionStorage.getItem(KEY) ?? 0);
        if (Date.now() - last < COOLDOWN_MS) return;
        window.sessionStorage.setItem(KEY, String(Date.now()));

        const { pushLocalToServer } = await import('@/lib/sync');
        await pushLocalToServer();
        const { flushRecallQueue, flushSynPickQueue, flushHistoryQueue, flushSessionQueue } = await import('@/lib/storage');
        flushRecallQueue();
        flushSynPickQueue();
        flushHistoryQueue();
        flushSessionQueue();
      } catch {
        /* ignore */
      }
    }

    bootstrap();

    // 네트워크 복구 시 미동기화 이벤트 재시도
    const onOnline = () => { import('@/lib/storage').then((m) => { m.flushRecallQueue(); m.flushSynPickQueue(); m.flushHistoryQueue(); m.flushSessionQueue(); }); };
    window.addEventListener('online', onOnline);

    // 로그인/로그아웃 이벤트 캐치 (다른 탭, 토큰 만료 포함)
    const supabase = createClient();
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        window.sessionStorage.removeItem(KEY);
        window.localStorage.setItem(OWNER_KEY, session.user.id);
        bootstrap();
      } else if (event === 'SIGNED_OUT') {
        clearLocalUserData();
        window.localStorage.removeItem(OWNER_KEY);
        reloadIfDashboard();
      }
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
      window.removeEventListener('online', onOnline);
    };
  }, []);

  return null;
}
