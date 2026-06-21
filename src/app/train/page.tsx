'use client';
// 회상 훈련 — 가중치 출제. 두 모드:
//   choice: 같은 묶음(부모/형제) 후보 4개 중 정답 고르기
//   cloze : 감정/메모/연관 단어 일부를 단서로 빈칸 채우기
// 결과는 localStorage 세션으로 저장.

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { appendSession, uid, updateVocab } from '@/lib/storage';
import { pickQueue, updateScore, pickDistractorsFromVocab } from '@/lib/training';
import { useI18n } from '@/lib/i18n';
import type { TrainingAnswer, TrainingSession, VocabularyItem } from '@/lib/types';

const TRIAL_COUNT = 5;

export default function TrainPage() {
  const { t } = useI18n();
  const router = useRouter();
  const [all, setAll] = useState<VocabularyItem[] | null>(null);
  const [queue, setQueue] = useState<VocabularyItem[]>([]);
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState<TrainingAnswer[]>([]);
  const [sessionStart] = useState(Date.now());

  useEffect(() => {
    let cancelled = false;
    // 서버 우선 로드 — 다른 기기/캐시 삭제/시크릿 창 등 localStorage가 비어 있어도
    // 서버에 있는 단어로 훈련을 시작할 수 있게 한다. 큐는 최종 단어 목록으로 1회만 구성.
    (async () => {
      const { loadVocab } = await import('@/lib/sync');
      const v = await loadVocab();
      if (cancelled) return;
      setAll(v);
      setQueue(pickQueue(v, TRIAL_COUNT));
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (all === null) return <p className="text-slate-500">{t('common.loading')}</p>;
  if (all.length === 0)
    return (
      <div className="card space-y-3">
        <h1 className="display-md">{t('train.emptyTitle')}</h1>
        <p className="text-sm text-slate-500">{t('train.emptyDesc')}</p>
        <Link className="btn-primary" href="/record">{t('train.emptyCta')}</Link>
      </div>
    );

  if (idx >= queue.length) {
    return <End answers={answers} all={all} sessionStart={sessionStart} onDone={(s) => {
      appendSession(s);
      router.push('/result?sid=' + s.id);
    }} />;
  }

  const item = queue[idx];
  return (
    <Trial
      key={item.id}
      item={item}
      all={all}
      onDone={(a, updated) => {
        // 갱신 저장
        updateVocab(updated.id, updated);
        setAll((s) => (s ? s.map((x) => (x.id === updated.id ? updated : x)) : s));
        setAnswers((s) => [...s, a]);
        setIdx((i) => i + 1);
      }}
      progress={`${idx + 1} / ${queue.length}`}
    />
  );
}

function Trial({
  item, all, onDone, progress,
}: {
  item: VocabularyItem;
  all: VocabularyItem[];
  onDone: (a: TrainingAnswer, updated: VocabularyItem) => void;
  progress: string;
}) {
  const { t } = useI18n();
  // 항상 4지선다 — 사용자 단어가 부족하면 폴백 풀에서 채움(pickDistractorsFromVocab가 보장)
  const choices = useMemo(() => {
    const distractors = pickDistractorsFromVocab(all, item, 3);
    return [item.wordText, ...distractors].sort(() => Math.random() - 0.5);
  }, [item, all]);

  const [start] = useState(Date.now());
  const [submitted, setSubmitted] = useState<{ correct: boolean; ts: number; userAnswer: string } | null>(null);

  function hintText(): string {
    if (item.contextNote) return t('train.memo', { value: item.contextNote });
    if (item.emotionTags.length) return t('train.emotionHint', { value: item.emotionTags.join(', ') });
    return t('train.defaultHint', { count: item.wordText.length, first: item.wordText[0] });
  }

  function submitChoice(picked: string) {
    if (submitted) return;
    const ts = Date.now();
    const correct = picked.trim() === item.wordText.trim();
    setSubmitted({ correct, ts, userAnswer: picked });
  }

  function next() {
    if (!submitted) return;
    const a: TrainingAnswer = {
      itemId: item.id,
      promptType: 'choice',
      userAnswer: submitted.userAnswer,
      isCorrect: submitted.correct,
      timeMs: submitted.ts - start,
      usedHint: false,
      createdAt: submitted.ts,
    };
    onDone(a, updateScore(item, submitted.correct));
  }

  return (
    <div className="card space-y-5">
      <div className="flex items-center justify-between">
        <span className="pill bg-accentSoft text-accent">{t('train.badge')}</span>
        <span className="text-sm text-slate-400">{progress}</span>
      </div>
      <div>
        <p className="text-center text-lg font-bold text-slate-700">{hintText()}</p>
      </div>

      <div className="grid grid-cols-2 gap-2.5 max-[360px]:grid-cols-1">
        {choices.map((c) => {
          const isCorrect = c === item.wordText;
          const picked = submitted?.userAnswer === c;
          const cls = !submitted
            ? 'btn-ghost'
            : isCorrect
            ? 'btn-known ring-2 ring-emerald-400'
            : picked
            ? 'btn-unknown'
            : 'btn-ghost opacity-60';
          return (
            <button key={c} className={cls} onClick={() => submitChoice(c)} disabled={!!submitted}>
              {c}
            </button>
          );
        })}
      </div>

      {submitted && (
        <div className="flex items-center justify-between">
          <span className={`pill ${submitted.correct ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
            {submitted.correct ? `✅ ${t('train.correct', { word: item.wordText })}` : `❌ ${t('train.correct', { word: item.wordText })}`}
          </span>
          <button className="btn-primary" onClick={next}>{t('train.next')}</button>
        </div>
      )}
    </div>
  );
}

function End({
  answers, sessionStart, onDone,
}: {
  answers: TrainingAnswer[];
  all: VocabularyItem[];
  sessionStart: number;
  onDone: (s: TrainingSession) => void;
}) {
  const { t } = useI18n();
  // StrictMode(개발)에서 effect가 두 번 실행돼 세션이 중복 저장되는 것을 막는 가드.
  const submittedRef = useRef(false);
  useEffect(() => {
    if (submittedRef.current) return;
    submittedRef.current = true;
    const session: TrainingSession = {
      id: uid('s'),
      startedAt: sessionStart,
      endedAt: Date.now(),
      answers,
    };
    onDone(session);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return <p className="text-slate-500">{t('train.resultLoading')}</p>;
}
