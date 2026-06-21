'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { listVocab, listSessions, deleteVocab, getWordHistoryCounts, normalizeWord } from '@/lib/storage';
import EmotionIcon, { EMOTION_PALETTE } from '@/components/EmotionIcon';
import { EMOTIONS, resolveEmotion } from '@/lib/types';
import { useI18n } from '@/lib/i18n';
import type { EmotionTag, VocabularyItem } from '@/lib/types';

type SortKey = 'newest' | 'oldest' | 'emotion';

const PAGE_SIZE = 10;

// 정렬 시 사용할 표시 순서 — types.ts의 배열 순서를 그대로 따라간다.
const EMOTION_ORDER: Record<EmotionTag, number> = EMOTIONS.reduce(
  (acc, e, i) => ((acc[e.tag] = i), acc),
  {} as Record<EmotionTag, number>
);

function emotionRank(v: VocabularyItem): number {
  const first = v.emotionTags[0];
  if (!first) return Number.POSITIVE_INFINITY;
  return EMOTION_ORDER[first] ?? Number.POSITIVE_INFINITY;
}

export default function HomePage() {
  const { emotionLabel, t } = useI18n();
  const [vocab, setVocab] = useState<VocabularyItem[] | null>(null);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [sort, setSort] = useState<SortKey>('newest');
  const [onlyRepeated, setOnlyRepeated] = useState(false);
  const [page, setPage] = useState(1);

  useEffect(() => {
    let cancelled = false;
    // 1) 로컬로 즉시 페인트(빠른 표시 + 게스트/오프라인 동작 유지)
    setVocab(listVocab());
    setCounts(getWordHistoryCounts());
    listSessions(); // 기존 호환 (사용 안 함)
    // 2) 로그인 상태면 서버 우선으로 보정 — 다른 기기/캐시 삭제 후에도 단어가 보이고
    //    "훈련 시작" 버튼(summary.total>0)이 정상 노출되도록.
    (async () => {
      const { loadVocab } = await import('@/lib/sync');
      const v = await loadVocab();
      if (!cancelled) setVocab(v);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // 단어의 기록 횟수 — word_history 기준(없으면 단어 엔트리 자체로 최소 1회).
  function recordCount(v: VocabularyItem): number {
    return Math.max(1, counts[normalizeWord(v.wordText)] ?? 0);
  }

  // 정렬/필터가 바뀌면 1페이지로 리셋 — 페이지가 사라져 빈 화면 보이는 것 방지.
  useEffect(() => {
    setPage(1);
  }, [sort, onlyRepeated]);

  const summary = useMemo(() => {
    const v = vocab ?? [];
    // 정확도는 전체 훈련 기준(관련단어 포함). 기록 수는 사용자가 직접 기록한 단어만.
    const totalAttempts = v.reduce((s, x) => s + x.attempts, 0);
    const totalSuccess = v.reduce((s, x) => s + x.successes, 0);
    const accuracy = totalAttempts
      ? Math.round((totalSuccess / totalAttempts) * 100)
      : 0;
    const recorded = v.filter((x) => x.source === 'user_input').length;
    return { total: recorded, accuracy };
  }, [vocab]);

  const sorted = useMemo(() => {
    // 대시보드 "단어 기록"에는 사용자가 직접 기록한 단어만 노출.
    // 마인드맵에서 고른 관련단어(llm_suggested)는 Supabase에는 저장되지만 여기엔 안 보임.
    let v = (vocab ?? []).filter((x) => x.source === 'user_input');
    // "반복 단어만 보기" — 2회 이상 기록된 단어만.
    if (onlyRepeated) {
      v = v.filter((x) => (counts[normalizeWord(x.wordText)] ?? 0) >= 2);
    }
    if (sort === 'newest') {
      v.sort((a, b) => b.createdAt - a.createdAt);
    } else if (sort === 'oldest') {
      v.sort((a, b) => a.createdAt - b.createdAt);
    } else if (sort === 'emotion') {
      v.sort((a, b) => {
        const d = emotionRank(a) - emotionRank(b);
        return d !== 0 ? d : b.createdAt - a.createdAt;
      });
    }
    return v;
  }, [vocab, sort, onlyRepeated, counts]);

  // 최근 기록 항목 삭제 — 확인 후 로컬/서버에서 제거하고 목록 갱신.
  function handleDelete(id: string, word: string) {
    if (!confirm(t('home.deleteConfirm', { word }))) return;
    deleteVocab(id);
    setVocab((s) => (s ? s.filter((v) => v.id !== id) : s));
  }

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageStart = (currentPage - 1) * PAGE_SIZE;
  const paged = sorted.slice(pageStart, pageStart + PAGE_SIZE);

  if (vocab === null) {
    return <p className="text-slate-500">{t('home.loading')}</p>;
  }

  return (
    <div className="space-y-5">
      <section className="card">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <span className="eyebrow">{t('home.eyebrow')}</span>
            <h1 className="mt-1 display-xl">{t('home.title')}</h1>
            <p className="mt-2 max-w-md text-sm text-slate-600">
              {t('home.description')}
            </p>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link className="btn-primary" href="/record">{t('home.recordCta')}</Link>
          {summary.total > 0 && (
            <Link className="btn-ghost" href="/train">{t('home.trainCta')}</Link>
          )}
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3">
        <Stat label={t('home.stat.records')} value={summary.total} />
        <Stat label={t('home.stat.accuracy')} value={`${summary.accuracy}%`} />
      </section>

      <section className="card space-y-4">
        <div className="space-y-3">
          <h2 className="display-md">{t('home.recent')}</h2>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
            <div className="flex items-center gap-2">
              <label className="text-slate-500" htmlFor="sort">{t('home.sort')}</label>
              <select
                id="sort"
                value={sort}
                onChange={(e) => setSort(e.target.value as SortKey)}
                className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs"
              >
                <option value="newest">{t('home.sort.newest')}</option>
                <option value="oldest">{t('home.sort.oldest')}</option>
                <option value="emotion">{t('home.sort.emotion')}</option>
              </select>
            </div>
            <label className="flex cursor-pointer items-center gap-1.5 text-slate-500">
              <input
                type="checkbox"
                checked={onlyRepeated}
                onChange={(e) => setOnlyRepeated(e.target.checked)}
                className="h-3.5 w-3.5 accent-accent"
              />
              {t('home.onlyRepeated')}
            </label>
          </div>
        </div>

        {sorted.length === 0 ? (
          onlyRepeated ? (
            <p className="text-slate-500">{t('home.noRepeated')}</p>
          ) : (
            <p className="text-slate-500">
              {t('home.empty')}{' '}
              <Link className="text-accent underline-offset-4 hover:underline" href="/record">
                {t('home.emptyLink')}
              </Link>
            </p>
          )
        ) : (
          <ul className="divide-y divide-slate-100">
            {paged.map((v) => (
              <li key={v.id} className="py-3">
                <div className="flex items-start justify-between gap-2">
                  <Link
                    href={`/history/${encodeURIComponent(v.id)}`}
                    className="min-w-0 flex-1 truncate text-base font-semibold text-ink transition-colors hover:text-accent"
                  >
                    {v.wordText}
                  </Link>
                  <div className="flex shrink-0 flex-col items-end gap-2">
                    <span className="flex items-center gap-1.5 whitespace-nowrap text-xs text-slate-400">
                      {recordCount(v) >= 2 && (
                        <span className="rounded-full bg-accent/10 px-1.5 py-0.5 font-semibold text-accent">
                          {t('home.recordedTimes', { count: String(recordCount(v)) })}
                        </span>
                      )}
                      {formatDate(v.createdAt)}
                    </span>
                    <div className="flex max-w-[240px] flex-wrap items-center justify-end gap-1 max-[420px]:max-w-[160px]">
                      {v.emotionTags.map((et) => {
                        const e = resolveEmotion(et);
                        if (!e) return null;
                        const p = EMOTION_PALETTE[e.tag];
                        return (
                          <span
                            key={et}
                            className="pill"
                            style={{ backgroundColor: p.fill, color: p.line }}
                          >
                            <EmotionIcon tag={et} className="h-3.5 w-3.5 shrink-0" />
                            {emotionLabel(et)}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                  <button
                    type="button"
                    aria-label={`${v.wordText} ${t('home.delete')}`}
                    onClick={() => handleDelete(v.id, v.wordText)}
                    className="-mr-1 grid h-6 w-6 shrink-0 place-items-center rounded-full text-slate-300 transition-colors hover:text-rose-500 active:scale-90"
                  >
                    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2m-8 0v12a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V7" />
                      <path d="M10 11v6M14 11v6" />
                    </svg>
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}

        {sorted.length > PAGE_SIZE && (
          <div className="flex items-center justify-between gap-3 pt-1 text-xs text-slate-500">
            <span>
              {pageStart + 1}–{pageStart + paged.length} / {sorted.length}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={currentPage <= 1}
                className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs disabled:opacity-40"
              >
                {t('common.previous')}
              </button>
              <span className="font-mono text-slate-600">
                {currentPage} / {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages}
                className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs disabled:opacity-40"
              >
                {t('common.next')}
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

function formatDate(ts: number): string {
  const d = new Date(ts);
  const yy = d.getFullYear() % 100;
  const mo = String(d.getMonth() + 1).padStart(2, '0');
  const da = String(d.getDate()).padStart(2, '0');
  return `${yy}.${mo}.${da}`;
}

function Stat({ label, value, tone }: { label: string; value: number | string; tone?: 'accent' | 'risk' }) {
  return (
    <div className="rounded-lg bg-white p-4 ring-1 ring-hairline">
      <div className="eyebrow">{label}</div>
      <div
        className={`mt-1 text-2xl font-bold ${
          tone === 'risk' ? 'text-risk' : tone === 'accent' ? 'text-accent' : 'text-ink'
        }`}
      >
        {value}
      </div>
    </div>
  );
}
