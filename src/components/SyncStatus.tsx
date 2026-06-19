'use client';

// 로그인 상태일 때만 보이는 동기화 상태/수동 동기화 버튼.
// 게스트면 안내 메시지만.

import { useEffect, useState, useTransition } from 'react';
import Link from 'next/link';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { listVocab } from '@/lib/storage';

export default function SyncStatus() {
  const [loaded, setLoaded] = useState(false);
  const [email, setEmail] = useState<string | null>(null);
  const [localCount, setLocalCount] = useState(0);
  const [serverCount, setServerCount] = useState<number | null>(null);
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  async function refresh() {
    if (!isSupabaseConfigured()) {
      setLoaded(true);
      return;
    }
    const supabase = createClient();
    const { data } = await supabase.auth.getUser();
    setEmail(data.user?.email ?? null);
    setLocalCount(listVocab().length);
    if (data.user) {
      const { count } = await supabase
        .from('vocabulary_items')
        .select('*', { count: 'exact', head: true });
      setServerCount(count ?? 0);
    } else {
      setServerCount(null);
    }
    setLoaded(true);
  }

  useEffect(() => {
    refresh();
  }, []);

  function syncNow() {
    setMsg(null);
    startTransition(async () => {
      try {
        const { pushLocalToServer } = await import('@/lib/sync');
        await pushLocalToServer();
        await refresh();
        setMsg('동기화 완료');
      } catch (e) {
        setMsg('동기화 실패: ' + (e instanceof Error ? e.message : String(e)));
      }
    });
  }

  if (!loaded) return null;
  if (!isSupabaseConfigured()) return null;

  if (!email) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
        <Link href="/login" className="underline font-semibold">
          로그인
        </Link>{' '}
        하면 기록이 서버에도 자동 저장되어 다른 기기에서도 볼 수 있어요.
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white/70 p-3 text-xs text-slate-600">
      <div className="flex items-center justify-between gap-2">
        <div>
          <span className="font-semibold text-slate-700">동기화 상태</span>{' '}
          <span className="text-slate-500">·</span>{' '}
          이 기기 <span className="font-mono">{localCount}</span> ·{' '}
          서버 <span className="font-mono">{serverCount ?? '...'}</span>
        </div>
        <button
          onClick={syncNow}
          disabled={pending}
          className="rounded bg-slate-900 text-white px-2 py-1 text-xs disabled:opacity-50"
        >
          {pending ? '동기화 중…' : '지금 동기화'}
        </button>
      </div>
      {msg && <p className="mt-1 text-slate-500">{msg}</p>}
    </div>
  );
}
