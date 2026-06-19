'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { PW_RULES, passwordIssues } from '@/lib/password';

export default function SignupPage() {
  const [step, setStep] = useState<'form' | 'code'>('form');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [gender, setGender] = useState<'' | 'male' | 'female' | 'unspecified'>('');
  const [birthYear, setBirthYear] = useState('');
  const [occupation, setOccupation] = useState<
    | ''
    | 'professional'
    | 'office'
    | 'technical'
    | 'service'
    | 'selfemployed'
    | 'agriculture'
    | 'homemaker'
    | 'student'
    | 'retired'
    | 'other'
    | 'unspecified'
  >('');
  const [code, setCode] = useState('');
  const [sentEmail, setSentEmail] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const configured = isSupabaseConfigured();

  // 1단계: 이메일/비밀번호/성별로 가입 요청 → 이메일로 인증번호 발송.
  function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setInfo(null);
    if (!configured) {
      setErr('Supabase가 설정되지 않았습니다.');
      return;
    }
    // 클라이언트 1차 검증(즉시 피드백) — 실제 강제는 서버 라우트가 한다.
    const issues = passwordIssues(password);
    if (issues.length > 0) {
      setErr(`비밀번호 조건을 충족해야 합니다: ${issues.join(', ')}`);
      return;
    }
    startTransition(async () => {
      // 서버 라우트에서 비밀번호 정책을 재검증한 뒤 signUp 한다(클라이언트 우회 방지).
      const res = await fetch('/auth/signup', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          gender: gender || undefined,
          birthYear: /^\d{4}$/.test(birthYear) ? Number(birthYear) : undefined,
          occupation: occupation || undefined,
        }),
      });
      const j = await res.json().catch(() => ({} as { error?: string; otpSent?: boolean }));
      if (!res.ok) {
        setErr(j.error ?? '가입에 실패했습니다.');
        return;
      }
      // 인증번호 입력 단계로.
      setSentEmail(email);
      setStep('code');
      setInfo(`${email} 로 인증번호를 보냈습니다. 메일을 확인해 입력해 주세요.`);
    });
  }

  // 2단계: 메일로 받은 인증번호 확인 → 가입 완료 + 로그인.
  function verify(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setInfo(null);
    const token = code.trim();
    if (!/^\d{4,10}$/.test(token)) {
      setErr('메일로 받은 숫자 인증번호를 입력해 주세요.');
      return;
    }
    startTransition(async () => {
      const supabase = createClient();
      const { data, error } = await supabase.auth.verifyOtp({
        email: sentEmail,
        token,
        type: 'email',
      });
      if (error || !data.session) {
        setErr(error?.message ?? '인증번호가 올바르지 않거나 만료되었습니다.');
        return;
      }
      // 세션 설정됨 → 새로고침하면 SyncBootstrap가 로컬 데이터를 서버로 올린다.
      window.location.href = '/';
    });
  }

  // 인증번호 재발송.
  function resend() {
    setErr(null);
    setInfo(null);
    startTransition(async () => {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOtp({
        email: sentEmail,
        options: { shouldCreateUser: false },
      });
      if (error) {
        setErr(error.message);
        return;
      }
      setInfo('인증번호를 다시 보냈습니다. 메일함을 확인해 주세요.');
    });
  }

  return (
    <div className="mx-auto max-w-md">
      <div className="card space-y-5">
        <div>
          <h1 className="display-lg">회원가입</h1>
          <p className="mt-2 text-sm text-slate-500">
            이미 계정이 있나요?{' '}
            <Link href="/login" className="text-accent underline-offset-4 hover:underline">
              로그인
            </Link>
          </p>
        </div>

        {!configured && (
          <div className="rounded-2xl bg-amber-50 p-4 text-sm text-amber-900 ring-1 ring-amber-100">
            Supabase 환경변수가 비어있습니다.
          </div>
        )}

        {step === 'form' ? (
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
              <span className="field-label">비밀번호 (8자 이상, 숫자·특수문자 포함)</span>
              <input
                type="password"
                required
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input"
              />
              <div className="mt-2 flex flex-wrap gap-1.5">
                {PW_RULES.map((r) => {
                  const ok = r.test(password);
                  return (
                    <span
                      key={r.key}
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs ${
                        ok ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-400'
                      }`}
                    >
                      <span aria-hidden="true">{ok ? '✓' : '○'}</span>
                      {r.label}
                    </span>
                  );
                })}
              </div>
            </label>

            <div className="block">
              <span className="field-label">성별 (선택)</span>
              <div className="flex flex-wrap gap-2">
                {([
                  { v: 'male', label: '남' },
                  { v: 'female', label: '여' },
                  { v: 'unspecified', label: '응답 안 함' },
                ] as const).map((g) => {
                  const on = gender === g.v;
                  return (
                    <button
                      key={g.v}
                      type="button"
                      onClick={() => setGender((cur) => (cur === g.v ? '' : g.v))}
                      className={`tagchip ${on ? 'tagchip--on' : ''}`}
                    >
                      {g.label}
                    </button>
                  );
                })}
              </div>
              <p className="mt-1.5 text-xs text-slate-400">
                인지 분석의 정확도를 높이기 위해 사용됩니다. 입력하지 않아도 가입할 수 있습니다.
              </p>
            </div>

            <label className="block">
              <span className="field-label">태어난 해 (선택)</span>
              <div className="flex items-center gap-3">
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={4}
                  placeholder="예: 1958"
                  value={birthYear}
                  onChange={(e) => setBirthYear(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  className="input max-w-[160px]"
                />
                {/^\d{4}$/.test(birthYear) &&
                  Number(birthYear) >= 1900 &&
                  Number(birthYear) <= 2030 && (
                    <span className="text-sm text-slate-500">
                      만 {new Date().getFullYear() - Number(birthYear)}세
                    </span>
                  )}
              </div>
            </label>

            <div className="block">
              <span className="field-label">직업 (선택)</span>
              <div className="flex flex-wrap gap-2">
                {([
                  { v: 'professional', label: '전문직' },
                  { v: 'office', label: '사무직' },
                  { v: 'technical', label: '기술·생산직' },
                  { v: 'service', label: '서비스·판매직' },
                  { v: 'selfemployed', label: '자영업' },
                  { v: 'agriculture', label: '농림어업' },
                  { v: 'homemaker', label: '주부' },
                  { v: 'student', label: '학생' },
                  { v: 'retired', label: '무직·은퇴' },
                  { v: 'other', label: '기타' },
                  { v: 'unspecified', label: '응답 안 함' },
                ] as const).map((o) => {
                  const on = occupation === o.v;
                  return (
                    <button
                      key={o.v}
                      type="button"
                      onClick={() => setOccupation((cur) => (cur === o.v ? '' : o.v))}
                      className={`tagchip ${on ? 'tagchip--on' : ''}`}
                    >
                      {o.label}
                    </button>
                  );
                })}
              </div>
              <p className="mt-1.5 text-xs text-slate-400">
                또래(연령·직업) 비교와 인지 보정에 사용됩니다. 입력하지 않아도 가입할 수 있습니다.
              </p>
            </div>

            {err && <p className="text-sm text-rose-600">{err}</p>}
            {info && <p className="text-sm text-emerald-700">{info}</p>}

            <button
              type="submit"
              disabled={pending || passwordIssues(password).length > 0}
              className="btn-primary w-full"
            >
              {pending ? '인증번호 보내는 중…' : '인증번호 받기'}
            </button>
          </form>
        ) : (
          <form onSubmit={verify} className="space-y-4">
            <label className="block">
              <span className="field-label">인증번호 (메일로 받은 숫자)</span>
              <input
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={10}
                placeholder="인증번호 입력"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 10))}
                className="input tracking-[0.3em] text-center text-xl"
                autoFocus
              />
              <p className="mt-1.5 text-xs text-slate-400">
                {sentEmail} 로 보낸 인증번호를 입력하세요.
              </p>
            </label>

            {err && <p className="text-sm text-rose-600">{err}</p>}
            {info && <p className="text-sm text-emerald-700">{info}</p>}

            <button
              type="submit"
              disabled={pending || code.length < 4}
              className="btn-primary w-full"
            >
              {pending ? '확인 중…' : '인증하고 가입 완료'}
            </button>

            <div className="flex items-center justify-between text-sm">
              <button
                type="button"
                onClick={resend}
                disabled={pending}
                className="text-accent underline-offset-4 hover:underline disabled:opacity-50"
              >
                인증번호 재발송
              </button>
              <button
                type="button"
                onClick={() => {
                  setStep('form');
                  setCode('');
                  setErr(null);
                  setInfo(null);
                }}
                className="text-slate-500 hover:text-ink"
              >
                이메일 다시 입력
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
