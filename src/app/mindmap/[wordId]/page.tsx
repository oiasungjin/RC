'use client';
// 마인드맵(노드맵) 화면 — 단어 1개에 대해 명사 DB에서 같은 분류의 동급어 10개를 받아옵니다.
// 중앙=입력 단어, 둘레=유사어 10개. 각 노드를 탭하면 알아요(초록)→몰라요(빨강)→해제 순환.
// "선택한 항목 저장"으로 known/unknown을 synonym_picks 테이블에 저장.

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { getVocab, uid, logSynonymPicks } from '@/lib/storage';
import { useI18n } from '@/lib/i18n';
import type { KnowledgeStatus, RelatedWord, VocabularyItem } from '@/lib/types';

type Selection = KnowledgeStatus; // 'known' | 'unknown' (없으면 미선택)

export default function MindmapPage() {
  const { t, language } = useI18n();
  const params = useParams<{ wordId: string }>();
  const router = useRouter();
  const wordId = params?.wordId as string;
  const [parent, setParent] = useState<VocabularyItem | undefined>(undefined);
  const [loaded, setLoaded] = useState(false);
  const [items, setItems] = useState<RelatedWord[] | null>(null);
  const [category, setCategory] = useState<string | null>(null);
  const [source, setSource] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [picks, setPicks] = useState<Record<string, Selection>>({});

  useEffect(() => {
    setParent(getVocab(wordId));
    setLoaded(true);
  }, [wordId]);

  async function generate() {
    if (!parent) return;
    setLoading(true);
    setError(null);
    setNotFound(false);
    try {
      const r = await fetch('/api/related-words', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ targetWord: parent.wordText, locale: language }),
      });
      const data = await r.json();
      if (!r.ok) {
        setError(data?.message || data?.error || `HTTP ${r.status}`);
        setItems([]);
      } else {
        setItems(data.items as RelatedWord[]);
        setCategory(data.category ?? null);
        setSource(data.source ?? null);
        setNotFound(Boolean(data.notFound));
        setPicks({});
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  // 탭 순환: 미선택 → 알아요(known) → 몰라요(unknown) → 미선택
  function cycle(word: string) {
    setPicks((p) => {
      const cur = p[word];
      const next: Record<string, Selection> = { ...p };
      if (!cur) next[word] = 'known';
      else if (cur === 'known') next[word] = 'unknown';
      else delete next[word];
      return next;
    });
  }

  function commit() {
    if (!items || !parent) return;
    const sel = items.filter((it) => picks[it.word] === 'known' || picks[it.word] === 'unknown');
    if (sel.length === 0) return;
    const ps = sel.map((it) => ({
      id: uid('sp'),
      parentWord: parent.wordText,
      parentItemId: parent.id,
      relatedWord: it.word,
      category: category ?? it.reason,
      freq: (it as RelatedWord & { freq?: string }).freq,
      status: picks[it.word] as 'known' | 'unknown',
      createdAt: Date.now(),
    }));
    logSynonymPicks(ps);
    router.push('/');
  }

  if (!loaded) {
    return <p className="text-slate-500">{t('mind.loading')}</p>;
  }
  if (!parent) {
    return (
      <div className="card space-y-2">
        <p>{t('mind.notFound')} (id: <code>{wordId}</code>)</p>
        <p className="text-sm text-slate-500">{t('mind.notFoundHelp')}</p>
        <Link className="text-accent underline" href="/record">{t('mind.newRecord')}</Link>
      </div>
    );
  }

  const unknownCount = Object.values(picks).filter((s) => s === 'unknown').length;
  const knownCount = Object.values(picks).filter((s) => s === 'known').length;
  const hasNodes = Boolean(items && items.length > 0);

  return (
    <div className="space-y-5">
      <section className="card space-y-3">
        <div className="flex items-center justify-between">
          <h1 className="display-lg">{t('mind.title', { word: parent.wordText })}</h1>
          <Link className="text-sm text-slate-500 hover:text-accent" href="/">{t('common.backDashboard')}</Link>
        </div>
        <p className="text-sm text-slate-600">{t('mind.desc')}</p>
        <button className="btn-primary" disabled={loading} onClick={generate}>
          {loading ? t('mind.generating') : items ? t('mind.regenerate') : t('mind.generate')}
        </button>
        {error && (
          <p className="rounded-lg bg-rose-50 px-4 py-2 text-sm text-rose-700">⚠ {error}</p>
        )}
        {notFound && (
          <p className="rounded-lg bg-amber-50 px-4 py-2 text-sm text-amber-800">{t('mind.notInDb')}</p>
        )}
        {source === 'llm' && (
          <p className="rounded-lg bg-sky-50 px-4 py-2 text-xs text-sky-800">{t('mind.llmNotice')}</p>
        )}
        {source === 'placeholder' && (
          <p className="rounded-lg bg-amber-50 px-4 py-2 text-sm text-amber-800">{t('mind.llmOff')}</p>
        )}
        <p className="border-t border-slate-100 pt-3 text-xs text-slate-400">{t('common.notDiagnosis')}</p>
      </section>

      {hasNodes && (
        <>
          <section className="card space-y-4">
            <div className="flex items-center justify-between gap-2">
              <h2 className="display-md">{t('mind.relatedCount', { count: items!.length })}</h2>
              {category && (
                <span className="pill bg-slate-100 text-slate-600">
                  {t('mind.category', { category })}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500">{t('mind.tapHint')}</p>

            <NodeMap items={items!} parentWord={parent.wordText} picks={picks} onTap={cycle} />

            {/* 범례 */}
            <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-slate-500">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-full bg-emerald-500" /> {t('common.known')}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-full bg-rose-500" /> {t('common.unknown')}
              </span>
            </div>
          </section>

          <section className="card">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm text-slate-500">
                {t('mind.saveSummary', { total: knownCount + unknownCount, unknown: unknownCount, known: knownCount })}
              </span>
              <button className="btn-primary" disabled={knownCount + unknownCount === 0} onClick={commit}>
                {t('mind.saveSelected')}
              </button>
            </div>
          </section>
        </>
      )}

      {items && items.length === 0 && !error && !notFound && source !== 'placeholder' && (
        <p className="text-slate-500">{t('mind.empty')}</p>
      )}
    </div>
  );
}

// 방사형 노드맵 — 중앙=입력 단어, 둘레=유사어. 탭하면 상태 순환.
function NodeMap({
  items,
  parentWord,
  picks,
  onTap,
}: {
  items: RelatedWord[];
  parentWord: string;
  picks: Record<string, Selection>;
  onTap: (word: string) => void;
}) {
  const n = items.length;
  const R = 39; // 둘레 반지름(%)
  const nodes = items.map((it, i) => {
    const ang = ((-90 + (360 / n) * i) * Math.PI) / 180;
    return { it, x: 50 + R * Math.cos(ang), y: 50 + R * Math.sin(ang) };
  });

  const lineColor = (sel: Selection | undefined) =>
    sel === 'known' ? '#10b981' : sel === 'unknown' ? '#f43f5e' : '#e2e8f0';

  function nodeClass(sel: Selection | undefined): string {
    if (sel === 'known') return 'bg-emerald-500 text-white ring-2 ring-emerald-300';
    if (sel === 'unknown') return 'bg-rose-500 text-white ring-2 ring-rose-300';
    return 'bg-white text-slate-700 ring-1 ring-slate-300 hover:ring-accent';
  }

  return (
    <div className="relative mx-auto aspect-square w-full max-w-md select-none">
      {/* 연결선 */}
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full">
        {nodes.map((nd) => (
          <line
            key={nd.it.word}
            x1="50"
            y1="50"
            x2={nd.x}
            y2={nd.y}
            stroke={lineColor(picks[nd.it.word])}
            strokeWidth="0.5"
          />
        ))}
      </svg>

      {/* 중앙 노드 */}
      <div className="absolute left-1/2 top-1/2 z-10 grid h-[24%] w-[24%] -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-accent px-1 text-center text-sm font-bold text-white shadow-card">
        <span className="line-clamp-2 break-keep">{parentWord}</span>
      </div>

      {/* 유사어 노드 */}
      {nodes.map((nd) => {
        const sel = picks[nd.it.word];
        return (
          <button
            key={nd.it.word}
            type="button"
            title={nd.it.word}
            onClick={() => onTap(nd.it.word)}
            style={{ left: `${nd.x}%`, top: `${nd.y}%` }}
            className={`absolute z-20 grid h-[20%] w-[20%] -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full px-1 text-center text-xs font-medium leading-tight shadow-sm transition-all active:scale-95 ${nodeClass(sel)}`}
          >
            <span className="line-clamp-2 break-keep">{nd.it.word}</span>
          </button>
        );
      })}
    </div>
  );
}
