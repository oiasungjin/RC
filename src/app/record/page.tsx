'use client';
// 단어 기록 — wordText + emotion(7점 양극 척도, 단일 선택) + 맥락 메모(선택) + status(known/unknown)
// 저장 후 마인드맵으로 이동해 LLM 동급 유사어 10개 받기.
// ?id=v_xxx 쿼리가 있으면 수정 모드로 동작 — 기존 항목을 불러와 prefill.

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import RecallAssistSheet from '@/components/RecallAssistSheet';
import EmotionIcon, { EMOTION_PALETTE } from '@/components/EmotionIcon';
import { addVocab, getVocab, listVocab, updateVocab, uid, logWordHistory, listWordHistory, normalizeWord } from '@/lib/storage';
import { noteKey } from '@/lib/training';
import { EMOTIONS } from '@/lib/types';
import { useI18n } from '@/lib/i18n';
import { useAuthStatus } from '@/lib/useAuthStatus';
import type { EmotionTag, RecallClueCheck, VocabularyItem } from '@/lib/types';

export default function RecordPage() {
  return (
    <Suspense fallback={<p className="text-slate-500">불러오는 중…</p>}>
      <RecordPageInner />
    </Suspense>
  );
}

function RecordPageInner() {
  const { emotionLabel, t } = useI18n();
  const auth = useAuthStatus();
  // Supabase가 설정된 배포 환경에서 로그아웃 상태면 기록을 막는다(정체불명 데이터 방지).
  // 세션 확인 중(loading)에도 막아 두어 로그아웃 사용자가 확인 전에 저장하는 것을 방지.
  const blockSave = auth.configured && (auth.loading || !auth.loggedIn);
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get('id') ?? '';
  const isEdit = Boolean(editId);

  const [word, setWord] = useState('');
  const [emotions, setEmotions] = useState<EmotionTag[]>([]);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(!isEdit);
  const [notFound, setNotFound] = useState(false);
  const [recallAssistOpen, setRecallAssistOpen] = useState(false);
  const [recallAnswers, setRecallAnswers] = useState<Record<string, string> | null>(null);

  // 수정 모드일 때 기존 데이터 prefill — 클라이언트에서 localStorage 읽기.
  useEffect(() => {
    if (!isEdit) return;
    const v = getVocab(editId);
    if (!v) {
      setNotFound(true);
      setLoaded(true);
      return;
    }
    setWord(v.wordText);
    setEmotions(v.emotionTags);
    setNote(v.contextNote ?? '');
    setRecallAnswers(
      v.recallClueCheck
        ? {
            firstLetter: v.recallClueCheck.firstLetterAnswer ?? '',
            lastLetter: v.recallClueCheck.lastLetterAnswer ?? '',
            letterCount: v.recallClueCheck.letterCountAnswer ?? '',
          }
        : null
    );
    setLoaded(true);
  }, [editId, isEdit]);

  function toggle(tag: EmotionTag) {
    // 감정은 하나만 선택 — 이미 선택된 것을 다시 누르면 해제.
    setEmotions((s) => (s.includes(tag) ? [] : [tag]));
  }

  function save(goMindmap: boolean) {
    const w = word.trim();
    if (!w) return;
    // 로그아웃 상태에서는 저장 자체를 막는다(버튼도 비활성화되지만 안전망).
    if (blockSave) {
      alert(t('record.loginRequiredAlert'));
      return;
    }

    // 감정·메모 필수 검증 — 비어 있으면 안내 알림 후 저장 중단.
    const missing: string[] = [];
    if (emotions.length === 0) missing.push(t('record.needEmotion'));
    if (!note.trim()) missing.push(t('record.needNote'));
    if (missing.length > 0) {
      alert(missing.join('\n'));
      return;
    }

    // 단어 설명 중복 경고(비차단) — 다른 단어에 같은 설명이 있으면 훈련 단서가 모호해져
    // 회상/침입 측정이 흐려진다. 막지는 않고 더 구체적으로 쓰도록 권유만 한다.
    const myWordNorm = normalizeWord(w);
    const k = noteKey(note);
    const dup = listVocab().find(
      (v) =>
        v.id !== editId &&
        normalizeWord(v.wordText) !== myWordNorm &&
        v.contextNote &&
        noteKey(v.contextNote) === k
    );
    if (dup && !confirm(t('record.dupNoteWarn', { word: dup.wordText }))) {
      return;
    }

    setSaving(true);
    const recallClueCheck = buildRecallClueCheck(w, recallAnswers);

    let navId: string;
    if (isEdit) {
      // 수정 — 기존 status, 가중치, source 등은 그대로 유지하고 사용자가 편집 가능한 필드만 patch.
      updateVocab(editId, {
        wordText: w,
        emotionTags: emotions,
        contextNote: note.trim() || undefined,
        recallClueCheck,
      });
      navId = editId;
    } else {
      const norm = normalizeWord(w);
      // 재기록 여부 판단 — addVocab가 병합하기 "전"의 기존(첫) 스냅샷을 잡아둔다.
      const prior = listVocab().find((v) => normalizeWord(v.wordText) === norm);

      const item: VocabularyItem = {
        id: uid('v'),
        wordText: w,
        emotionTags: emotions,
        contextNote: note.trim() || undefined,
        recallClueCheck,
        source: 'user_input',
        createdAt: Date.now(),
        difficultyScore: 2.0,
        attempts: 0,
        successes: 0,
      };
      const [stored] = addVocab([item]);
      navId = stored?.id ?? item.id;

      // 비용 최소화: 한 번만 기록된 단어는 vocabulary_items가 곧 그 기록이라 word_history에 중복 저장하지 않는다.
      // 재기록(2번째 이상)부터만 이력을 쌓되, 첫 재기록 시 곧 덮어쓰일 "원래 기록"을 백필해 보존한다.
      if (prior) {
        const now = Date.now();
        if (listWordHistory(norm).length === 0) {
          logWordHistory({
            id: uid('wh'),
            vocabItemId: prior.id,
            wordText: prior.wordText,
            wordNorm: norm,
            emotionTags: prior.emotionTags,
            contextNote: prior.contextNote,
            recallClueCheck: prior.recallClueCheck,
            source: prior.source,
            createdAt: prior.createdAt,
          });
        }
        logWordHistory({
          id: uid('wh'),
          vocabItemId: navId,
          wordText: w,
          wordNorm: norm,
          emotionTags: emotions,
          contextNote: note.trim() || undefined,
          recallClueCheck,
          source: 'user_input',
          createdAt: now,
        });
      }
    }

    if (goMindmap) router.push(`/mindmap/${navId}`);
    else router.push('/');
  }

  if (!loaded) {
    return <p className="text-slate-500">{t('record.loading')}</p>;
  }
  if (isEdit && notFound) {
    return (
      <div className="card space-y-2">
        <p>{t('record.notFound')} (id: <code>{editId}</code>)</p>
        <p className="text-sm text-slate-500">
          {t('record.notFoundHelp')}
        </p>
        <a className="text-accent underline" href="/">{t('common.backDashboard')}</a>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="card">
        <span className="eyebrow">{t('record.eyebrow')}</span>
        <h1 className="mt-1 display-xl">
          {isEdit ? t('record.titleEdit') : t('record.titleNew')}
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          {isEdit
            ? t('record.descEdit')
            : t('record.descNew')}
        </p>
        <p className="mt-3 border-t border-slate-100 pt-3 text-xs text-slate-400">
          {t('common.notDiagnosis')}
        </p>
      </div>

      <div className="card space-y-5">

        {blockSave && !auth.loading && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            <p className="font-semibold">{t('record.loginRequiredTitle')}</p>
            <p className="mt-1 text-amber-800">{t('record.loginRequiredBody')}</p>
            <div className="mt-2 flex gap-3">
              <a className="font-semibold underline underline-offset-2" href="/login">
                {t('record.loginCta')}
              </a>
              <a className="underline underline-offset-2" href="/signup">
                {t('record.signupCta')}
              </a>
            </div>
          </div>
        )}

        <label className="block">
          <span className="field-label">{t('record.word')}</span>
          <input
            autoFocus
            className="input text-xl font-semibold"
            placeholder={t('record.wordPlaceholder')}
            value={word}
            onChange={(e) => setWord(e.target.value)}
          />
        </label>
        <div className="-mt-4 flex justify-end">
          <button
            type="button"
            className="recall-trigger"
            onClick={() => setRecallAssistOpen(true)}
          >
            {t('record.recallTrigger')}
          </button>
        </div>

        <div>
          <span className="field-label">{t('record.emotion')}</span>
          <p className="-mt-1 mb-2 text-xs text-slate-400">{t('record.emotionScaleHint')}</p>
          <div className="flex flex-wrap gap-2">
            {EMOTIONS.map((e) => {
              const on = emotions.includes(e.tag);
              const p = EMOTION_PALETTE[e.tag];
              return (
                <button
                  key={e.tag}
                  type="button"
                  onClick={() => toggle(e.tag)}
                  className={`tagchip ${on ? 'tagchip--on' : ''}`}
                  style={
                    on
                      ? { backgroundColor: p.line, color: '#fff' }
                      : { backgroundColor: p.fill, color: p.line }
                  }
                >
                  <EmotionIcon tag={e.tag} tone={on ? 'inverse' : 'color'} className="h-4 w-4 shrink-0" />
                  {emotionLabel(e.tag)}
                </button>
              );
            })}
          </div>
        </div>

        <label className="block">
          <span className="field-label">{t('record.note')}</span>
          <textarea
            className="input min-h-[88px] text-base"
            placeholder={t('record.notePlaceholder')}
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </label>

        <div className="grid grid-cols-2 gap-2 border-t border-slate-100 pt-4 max-[380px]:grid-cols-1">
          <button className="btn-primary" disabled={!word.trim() || saving || blockSave} onClick={() => save(true)}>
            {isEdit ? t('record.saveAndRelated') : t('record.generate')}
          </button>
          <button className="btn-ghost" disabled={!word.trim() || saving || blockSave} onClick={() => save(false)}>
            {isEdit ? t('common.save') : t('record.saveOnly')}
          </button>
          {isEdit && (
            <button
              type="button"
              className="btn-ghost"
              disabled={saving}
              onClick={() => router.push('/')}
            >
              {t('common.cancel')}
            </button>
          )}
        </div>
      </div>
      <RecallAssistSheet
        open={recallAssistOpen}
        onClose={() => setRecallAssistOpen(false)}
        onInsertWord={(value, answers) => {
          setWord(value);
          setRecallAnswers(answers ?? null);
        }}
      />
    </div>
  );
}

function buildRecallClueCheck(
  word: string,
  answers: Record<string, string> | null
): RecallClueCheck | undefined {
  if (!answers) return undefined;

  const firstLetterAnswer = answers.firstLetter?.trim() ?? '';
  const lastLetterAnswer = answers.lastLetter?.trim() ?? '';
  const letterCountAnswer = answers.letterCount?.trim() ?? '';
  if (!firstLetterAnswer && !lastLetterAnswer && !letterCountAnswer) return undefined;

  const letters = Array.from(word.replace(/\s+/g, ''));
  const firstLetter = letters[0] ?? '';
  const lastLetter = letters[letters.length - 1] ?? '';
  const letterCount = letters.length;

  const firstLetterCorrect = firstLetterAnswer
    ? matchesLetterAnswer(firstLetterAnswer, firstLetter)
    : undefined;
  const lastLetterCorrect = lastLetterAnswer
    ? matchesLetterAnswer(lastLetterAnswer, lastLetter)
    : undefined;
  const letterCountCorrect = letterCountAnswer
    ? extractFirstNumber(letterCountAnswer) === letterCount
    : undefined;
  const checked = [firstLetterCorrect, lastLetterCorrect, letterCountCorrect].filter(
    (value): value is boolean => typeof value === 'boolean'
  );

  return {
    firstLetterAnswer: firstLetterAnswer || undefined,
    lastLetterAnswer: lastLetterAnswer || undefined,
    letterCountAnswer: letterCountAnswer || undefined,
    firstLetterCorrect,
    lastLetterCorrect,
    letterCountCorrect,
    allCorrect: checked.length > 0 ? checked.every(Boolean) : undefined,
  };
}

function matchesLetterAnswer(answer: string, actualLetter: string): boolean {
  const normalizedAnswer = normalizeClueText(answer);
  const normalizedActual = normalizeClueText(actualLetter);
  if (!normalizedAnswer || !normalizedActual) return false;
  if (normalizedAnswer === normalizedActual || normalizedAnswer.includes(normalizedActual)) {
    return true;
  }
  const initial = getHangulInitial(actualLetter);
  return Boolean(initial && normalizedAnswer.includes(initial));
}

function normalizeClueText(value: string): string {
  return value.replace(/\s+/g, '').toLowerCase();
}

function extractFirstNumber(value: string): number | undefined {
  const match = value.match(/\d+/);
  return match ? Number(match[0]) : undefined;
}

function getHangulInitial(value: string): string | undefined {
  const charCode = value.charCodeAt(0);
  const hangulStart = 0xac00;
  const hangulEnd = 0xd7a3;
  if (charCode < hangulStart || charCode > hangulEnd) return undefined;
  const initials = [
    'ㄱ',
    'ㄲ',
    'ㄴ',
    'ㄷ',
    'ㄸ',
    'ㄹ',
    'ㅁ',
    'ㅂ',
    'ㅃ',
    'ㅅ',
    'ㅆ',
    'ㅇ',
    'ㅈ',
    'ㅉ',
    'ㅊ',
    'ㅋ',
    'ㅌ',
    'ㅍ',
    'ㅎ',
  ];
  return initials[Math.floor((charCode - hangulStart) / 588)];
}
