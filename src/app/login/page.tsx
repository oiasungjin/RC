'use client';

import { Suspense, useState, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client';

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get('next') ?? '/';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const configured = isSupabaseConfigured();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setInfo(null);
    if (!configured) {
      setErr('Supabase가 설정되지 않았습니다. .env.local을 확인하세요.');
      return;
    }
    startTransition(async () => {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) {
        setErr(error.message);
        return;
      }
      try {
        const { pushLocalToServer } = await import('@/lib/sync');
        await pushLocalToServer();
      } catch {}
      router.replace(next);
      router.refresh();
    });
  }

  return (
    <div className="card space-y-5">
      <div>
        <h1 className="display-lg">로그인</h1>
        <p className="mt-2 text-sm text-slate-500">
          계정이 없으면{' '}
          <Link href="/signup" className="text-accent underline-offset-4 hover:underline">
            회원가입
          </Link>{' '}
          해주세요.
        </p>
      </div>

      {!configured && (
        <div className="rounded-2xl bg-amber-50 p-4 text-sm text-amber-900 ring-1 ring-amber-100">
          Supabase 환경변수가 비어있습니다. <code>.env.local</code>에
          <code>NEXT_PUBLIC_SUPABASE_URL</code>,{' '}
          <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code>를 설정해 주세요.
        </div>
      )}

      <form onSubmit={submit} className="space-y-4">
        <label className="block">
          <span className="field-label">이메일</span>
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="input"
          />
        </label>
        <label className="block">
          <span className="field-label">비밀번호</span>
          <input
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="input"
          />
        </label>

        {err && <p className="text-sm text-rose-600">{err}</p>}
        {info && <p className="text-sm text-emerald-700">{info}</p>}

        <button type="submit" disabled={pending} className="btn-primary w-full">
          {pending ? '로그인 중…' : '로그인'}
        </button>
      </form>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="mx-auto max-w-md">
      <Suspense fallback={<p className="text-sm text-slate-500">로딩…</p>}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
