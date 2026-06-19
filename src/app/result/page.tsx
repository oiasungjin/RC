'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { listSessions, listVocab } from '@/lib/storage';
import type { TrainingSession, VocabularyItem } from '@/lib/types';
import { useI18n } from '@/lib/i18n';

function ResultInner() {
  const { t } = useI18n();
  const sp = useSearchParams();
  const sid = sp.get('sid');
  const [session, setSession] = useState<TrainingSession | null>(null);
  const [vocab, setVocab] = useState<VocabularyItem[]>([]);

  useEffect(() => {
    const all = listSessions();
    setSession(sid ? all.find((s) => s.id === sid) ?? all[0] ?? null : all[0] ?? null);
    setVocab(listVocab());
  }, [sid]);

  if (!session) return <p className="text-slate-500">{t('result.none')}</p>;

  const ok = session.answers.filter((a) => a.isCorrect).length;
  const total = session.answers.length;

  return (
    <div className="space-y-5">
      <section className="card space-y-3">
        <h1 className="display-lg">{t('result.title')}</h1>
        <div className="flex items-baseline gap-4">
          <span className="font-display text-5xl font-semibold tracking-[-0.022em] text-accent">{ok}/{total}</span>
          <span className="text-slate-500">{t('result.correct')}</span>
        </div>
        <div className="flex flex-wrap gap-2 pt-2">
          <Link className="btn-primary" href="/train">{t('result.retry')}</Link>
          <Link className="btn-ghost" href="/">{t('result.dashboard')}</Link>
        </div>
      </section>

      <section className="card space-y-2">
        <h2 className="display-md">{t('result.byQuestion')}</h2>
        <ul className="space-y-2">
          {session.answers.map((a, i) => {
            const item = vocab.find((v) => v.id === a.itemId);
            return (
              <li key={i} className="flex items-center justify-between rounded-lg border border-slate-100 px-4 py-2">
                <div className="flex items-center gap-2">
                  <span className={`pill ${a.isCorrect ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                    {a.isCorrect ? '✅' : '❌'}
                  </span>
                  <span className="font-semibold">{item?.wordText ?? a.itemId}</span>
                  <span className="text-xs text-slate-400">{a.promptType === 'choice' ? t('result.choice') : t('result.cloze')}</span>
                </div>
                <span className="text-xs text-slate-400">{t('result.seconds', { value: Math.round(a.timeMs / 100) / 10 })}</span>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}

export default function ResultPage() {
  return (
    <Suspense fallback={<p className="text-slate-500">Loading...</p>}>
      <ResultInner />
    </Suspense>
  );
}
