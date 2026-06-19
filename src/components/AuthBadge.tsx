import Link from 'next/link';
import { getSessionUser, isAdmin } from '@/lib/auth';
import { isSupabaseConfigured } from '@/lib/supabase/server';
import LogoutButton from './LogoutButton';

export default async function AuthBadge() {
  if (!isSupabaseConfigured()) {
    return (
      <span className="text-xs text-slate-400" title="Supabase 미설정 — 게스트 모드">
        게스트
      </span>
    );
  }
  const user = await getSessionUser();
  if (!user) {
    // 로그아웃 상태 — "게스트(저장 안 됨)"임을 분명히 보여주고 로그인 링크 제공.
    return (
      <div
        className="flex items-center gap-2 text-xs"
        title="로그아웃 상태 — 기록이 저장되지 않습니다"
      >
        <span className="inline-flex items-center gap-1 text-slate-400">
          <span className="h-1.5 w-1.5 rounded-full bg-slate-300" aria-hidden="true" />
          게스트
        </span>
        <Link
          href="/login"
          className="rounded-full bg-accent px-2.5 py-1 text-xs font-semibold text-white transition-colors hover:opacity-90"
        >
          로그인
        </Link>
      </div>
    );
  }
  const admin = await isAdmin();
  // 이메일에서 @ 앞부분만 짧게
  const shortName = user.email?.split('@')[0] ?? '';
  return (
    <div className="flex items-center gap-2 text-xs">
      {admin && (
        <Link
          href="/admin"
          className="rounded bg-amber-100 px-2 py-0.5 text-amber-900 font-semibold whitespace-nowrap"
        >
          관리자
        </Link>
      )}
      <span
        className="inline-flex items-center gap-1 text-slate-600 max-w-[12ch]"
        title={`로그인됨 · ${user.email ?? ''}`}
      >
        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" aria-hidden="true" />
        <span className="truncate">{shortName}</span>
      </span>
      <LogoutButton />
    </div>
  );
}
