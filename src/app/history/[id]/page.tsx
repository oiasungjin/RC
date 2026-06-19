'use client';
// 단어 타임라인 — 같은 단어를 기록할 때마다 쌓인 시점별 이력(감정·메모·회상단서)을 날짜순으로 보여준다.
// 로컬 저장소가 1차 출처이고, 로그인 상태면 서버(word_history)에서 다른 기기 기록까지 합쳐 온다.

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import EmotionIcon, { EMOTION_PALETTE } from '@/components/EmotionIcon';
import { resolveEmotion } from '@/lib/types';
import { getVocab, listWordHistory, mergeServerWordHistory, normalizeWord } from '@/lib/storage';
import { useI18n } from '@/lib/i18n';
import type { EmotionTag } from '@/lib/types';
import type { WordHistoryEvent } from '@/lib/sync';

export default function WordHistoryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { emotionLabel, t } = useI18n();
  const [wordText, setWordText] = useState<string | null>(null);
  const [norm, setNorm] = useState<string>('');
  const [events, setEvents] = useState<WordHistoryEvent[] | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const v = getVocab(id);
    if (!v) {
      setNotFound(true);
      setEvents([]);
      return;
    }
    const n = normalizeWord(v.wordText);
    setWordText(v.wordText);
    setNorm(n);

    // 이 기능 도입 이전에 기록된 단어는 이력 행이 없으므로, 비어 있으면 단어 엔트리 자체로 1건을 합성한다.
    const fallback: WordHistoryEvent = {
      id: `legacy_${v.id}`,
      vocabItemId: v.id,
      wordText: v.wordText,
      wordNorm: n,
      emotionTags: v.emotionTags,
      contextNote: v.contextNote,
      recallClueCheck: v.recallClueCheck,
      source: v.source,
      createdAt: v.createdAt,
    };
    const withFallback = (rows: WordHistoryEvent[]) => (rows.length ? rows : [fallback]);
    setEvents(withFallback(listWordHistory(n)));

    // 서버 이력 머지 후 재조회 (다른 기기 기록 포함). 실패해도 로컬 이력은 그대로.
    import('@/lib/sync').then(async (s) => {
      try {
        const server = await s.fetchWordHistory(n);
        if (server.length) {
          mergeServerWordHistory(server);
          setEvents(withFallback(listWordHistory(n)));
        }
      } catch {
        /* ignore */
      }
    });
  }, [id]);

  if (events === null) {
    return <p className="text-slate-500">{t('record.loading')}</p>;
  }

  if (notFound) {
    return (
      <div className="card space-y-2">
        <p>{t('record.notFound')} (id: <code>{id}</code>)</p>
        <Link className="text-accent underline" href="/">{t('common.backDashboard')}</Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="card">
        <Link className="text-sm text-slate-400 hover:text-accent" href="/">
          {t('common.backDashboard')}
        </Link>
        <div className="mt-2 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <span className="eyebrow">{t('history.eyebrow')}</span>
            <h1 className="mt-1 display-xl break-words">{wordText}</h1>
            <p className="mt-2 text-sm text-slate-500">
              {t('history.count', { count: String(events.length) })}
            </p>
          </div>
          <Link className="btn-ghost shrink-0" href={`/record?id=${encodeURIComponent(id)}`}>
            {t('history.edit')}
          </Link>
        </div>
      </div>

      {events.length === 0 ? (
        <div className="card">
          <p className="text-slate-500">{t('history.empty')}</p>
        </div>
      ) : (
        <ol className="card space-y-0 divide-y divide-slate-100">
          {events.map((e) => (
            <li key={e.id} className="py-4 first:pt-0 last:pb-0">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-semibold text-ink">{formatDateTime(e.createdAt)}</span>
                <div className="flex flex-wrap items-center justify-end gap-1">
                  {(e.emotionTags as EmotionTag[]).map((et) => {
                    const def = resolveEmotion(et);
                    if (!def) return null;
                    const p = EMOTION_PALETTE[def.tag];
                    return (
                      <span key={et} className="pill" style={{ backgroundColor: p.fill, color: p.line }}>
                        <EmotionIcon tag={et} className="h-3.5 w-3.5 shrink-0" />
                        {emotionLabel(et)}
                      </span>
                    );
                  })}
                </div>
              </div>
              {e.contextNote && (
                <p className="mt-2 whitespace-pre-wrap text-base text-slate-700">{e.contextNote}</p>
              )}
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

function formatDateTime(ts: number): string {
  const d = new Date(ts);
  const yy = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, '0');
  const da = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  return `${yy}.${mo}.${da} ${hh}:${mi}`;
}
