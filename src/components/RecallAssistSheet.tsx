'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useI18n } from '@/lib/i18n';
import { logRecallAssist, saveRecallLocal, uid } from '@/lib/storage';
import type { RecallAssistEvent } from '@/lib/sync';

type RecallType = 'object' | 'person';
type SheetStep = 'intro' | 'question' | 'copy' | 'return';

// 음운 단서(첫 소리·글자 수·초성) — 사용자가 추측으로 틀릴 수 있어 LLM에 '약한 힌트'로만 전달.
const UNCERTAIN_KEYS = ['firstLetter', 'letterCount', 'initial'];

type Question = {
  key: string;
  title: string;
  helper: string;
  input: 'text' | 'textarea' | 'choice';
  choices?: string[];
};

type RecallAssistSheetProps = {
  open: boolean;
  onClose: () => void;
  onInsertWord: (word: string, recallAnswers?: Record<string, string>) => void;
};

function objectQuestions(t: ReturnType<typeof useI18n>['t']): Question[] {
  return [
  {
    key: 'context',
    title: t('recall.object.context.title'),
    helper: t('recall.object.context.helper'),
    input: 'textarea',
  },
  {
    key: 'meaning',
    title: t('recall.object.meaning.title'),
    helper: t('recall.object.meaning.helper'),
    input: 'textarea',
  },
  {
    key: 'visual',
    title: t('recall.object.visual.title'),
    helper: t('recall.object.visual.helper'),
    input: 'textarea',
  },
  {
    key: 'firstLetter',
    title: t('recall.object.first.title'),
    helper: t('recall.object.first.helper'),
    input: 'text',
  },
  {
    key: 'letterCount',
    title: t('recall.object.count.title'),
    helper: t('recall.object.count.helper'),
    input: 'text',
  },
  ];
}

function personQuestions(t: ReturnType<typeof useI18n>['t']): Question[] {
  return [
  {
    key: 'field',
    title: t('recall.person.field.title'),
    helper: t('recall.person.field.helper'),
    input: 'choice',
    choices: [
      t('recall.person.choice.entertainer'),
      t('recall.person.choice.athlete'),
      t('recall.person.choice.public'),
      t('recall.person.choice.expert'),
      t('recall.person.choice.private'),
    ],
  },
  {
    key: 'work',
    title: t('recall.person.work.title'),
    helper: t('recall.person.work.helper'),
    input: 'textarea',
  },
  {
    key: 'appearance',
    title: t('recall.person.appearance.title'),
    helper: t('recall.person.appearance.helper'),
    input: 'textarea',
  },
  {
    key: 'initial',
    title: t('recall.person.initial.title'),
    helper: t('recall.person.initial.helper'),
    input: 'text',
  },
  ];
}

function questionsFor(type: RecallType | null, t: ReturnType<typeof useI18n>['t']): Question[] {
  return type === 'person' ? personQuestions(t) : objectQuestions(t);
}

export default function RecallAssistSheet({
  open,
  onClose,
  onInsertWord,
}: RecallAssistSheetProps) {
  const { t } = useI18n();
  const [sheetStep, setSheetStep] = useState<SheetStep>('intro');
  const [recallType, setRecallType] = useState<RecallType | null>(null);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [foundWord, setFoundWord] = useState('');
  const [copied, setCopied] = useState(false);
  const [usedLlm, setUsedLlm] = useState(false);

  const sessionId = useRef<string | null>(null);
  const sessionStartedAt = useRef<number>(0);
  const finalized = useRef(false); // 단어를 찾아 resolved=true로 마감했는지 (이후 resolved=false로 덮어쓰지 않게)

  // pagehide 핸들러가 최신 상태를 읽을 수 있도록 항상 최신값을 유지하는 ref
  const latest = useRef({ answers, recallType, usedLlm, foundWord });

  const questions = useMemo(() => questionsFor(recallType, t), [recallType, t]);
  const currentQuestion = questions[questionIndex];
  const currentAnswer = currentQuestion ? answers[currentQuestion.key] ?? '' : '';
  const isPrivateContact = recallType === 'person' && answers.field === t('recall.person.choice.private');

  const promptText = useMemo(() => {
    if (!recallType) return '';
    const target = recallType === 'person' ? t('recall.promptTargetPerson') : t('recall.promptTargetObject');
    const uncertainNums: number[] = [];
    const rows = questions
      .map((question, index) => {
        const answer = answers[question.key]?.trim();
        if (!answer) return null;
        const uncertain = UNCERTAIN_KEYS.includes(question.key);
        if (uncertain) uncertainNums.push(index + 1);
        const tag = uncertain ? ` ${t('recall.promptUncertainTag')}` : '';
        return `${index + 1}. ${question.title}${tag}\n${t('recall.promptAnswer')}: ${answer}`;
      })
      .filter(Boolean)
      .join('\n\n');

    const parts = [t('recall.promptIntro', { target }), t('recall.promptRule')];
    if (uncertainNums.length) parts.push(t('recall.promptUncertainRule', { nums: uncertainNums.join('·') }));
    parts.push('', rows || t('recall.promptEmpty'));
    return parts.join('\n');
  }, [answers, questions, recallType, t]);

  // 최신 상태를 ref에 반영 (매 렌더마다)
  latest.current = { answers, recallType, usedLlm, foundWord };

  // pagehide/visibilitychange: 로컬 저장만 (네트워크는 unload 중 완료 불가)
  useEffect(() => {
    function persistLocalOnly() {
      const s = latest.current;
      if (!s.recallType || !sessionId.current) return;
      if (finalized.current) return;
      if (!hasAnyData(s.answers, s.foundWord)) return;
      saveRecallLocal(buildEventFromSnap(s.foundWord || null, false, {
        answers: s.answers,
        recallType: s.recallType,
        usedLlm: s.usedLlm,
      }));
    }
    function onHide() { persistLocalOnly(); }
    const onVis = () => { if (document.visibilityState === 'hidden') onHide(); };
    window.addEventListener('pagehide', onHide);
    document.addEventListener('visibilitychange', onVis);
    return () => {
      window.removeEventListener('pagehide', onHide);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, []); // persistLocalOnly은 latest ref를 통해 항상 최신값 읽음 — deps 불필요

  if (!open) return null;

  // ---- helpers ----

  function hasAnyData(ans: Record<string, string>, found: string | null | undefined) {
    return Object.values(ans).some((v) => v && v.trim()) || Boolean(found && found.trim());
  }

  function buildEvent(found: string | null, resolved: boolean, snap = { answers, recallType, usedLlm }): RecallAssistEvent {
    return {
      id: sessionId.current as string,
      recallType: snap.recallType as 'object' | 'person',
      answers: snap.answers,
      foundWord: found?.trim() || undefined,
      resolved,
      usedLlm: snap.usedLlm,
      createdAt: sessionStartedAt.current,
    };
  }

  // pagehide 전용 버전: 인자로 snap을 받아 stale closure 없이 동작
  function buildEventFromSnap(
    found: string | null,
    resolved: boolean,
    snap: { answers: Record<string, string>; recallType: RecallType; usedLlm: boolean }
  ): RecallAssistEvent {
    return {
      id: sessionId.current as string,
      recallType: snap.recallType,
      answers: snap.answers,
      foundWord: found?.trim() || undefined,
      resolved,
      usedLlm: snap.usedLlm,
      createdAt: sessionStartedAt.current,
    };
  }

  // 로컬 저장 + 서버 push 시도
  function persist(found: string | null, resolved: boolean) {
    if (!recallType || !sessionId.current) return;
    if (!hasAnyData(answers, found)) return;
    logRecallAssist(buildEvent(found, resolved));
  }

  // ---- event handlers ----

  function resetAndClose() {
    if (!finalized.current) persist(null, false);
    setSheetStep('intro');
    setRecallType(null);
    setQuestionIndex(0);
    setAnswers({});
    setFoundWord('');
    setCopied(false);
    setUsedLlm(false);
    sessionId.current = null;
    sessionStartedAt.current = 0;
    finalized.current = false;
    onClose();
  }

  function start(type: RecallType) {
    sessionId.current = uid('ra');
    sessionStartedAt.current = Date.now();
    finalized.current = false;
    setUsedLlm(false);
    setRecallType(type);
    setQuestionIndex(0);
    setAnswers({});
    setCopied(false);
    setSheetStep('question');
  }

  function rememberNow() {
    setSheetStep('return');
    setFoundWord('');
  }

  function setAnswer(value: string) {
    if (!currentQuestion) return;
    setAnswers((prev) => ({ ...prev, [currentQuestion.key]: value }));
  }

  function nextQuestion() {
    if (!currentQuestion || isPrivateContact) return;
    // 각 "다음" 단계마다 현재 답변 상태를 증분 upsert
    persist(null, false);
    if (questionIndex < questions.length - 1) {
      setQuestionIndex((index) => index + 1);
      return;
    }
    setSheetStep('copy');
  }

  async function copyAndOpenGemini() {
    setUsedLlm(true);
    // usedLlm state 업데이트는 비동기이므로 명시적 스냅샷으로 persist
    if (recallType && sessionId.current && hasAnyData(answers, null)) {
      logRecallAssist(buildEvent(null, false, { answers, recallType, usedLlm: true }));
    }
    try {
      await navigator.clipboard.writeText(promptText);
      setCopied(true);
    } catch {
      setCopied(false);
    }
    window.open('https://gemini.google.com/app', '_blank', 'noopener,noreferrer');
    setSheetStep('return');
  }

  function finishWithWord() {
    const value = foundWord.trim();
    if (!value) return;
    persist(value, true);         // upsert resolved=true + found word
    finalized.current = true;     // 이후 close에서 resolved=false로 덮어쓰기 방지
    onInsertWord(value, {
      firstLetter: answers.firstLetter ?? '',
      lastLetter: '',
      letterCount: answers.letterCount ?? '',
    });
    resetAndClose();
  }

  return (
    <div className="recall-sheet" role="dialog" aria-modal="true" aria-labelledby="recall-title">
      <button className="recall-sheet__backdrop" type="button" aria-label={t('recall.close')} onClick={resetAndClose} />
      <section className="recall-sheet__panel">
        <div className="recall-sheet__handle" />
        <div className="recall-sheet__header">
          <div>
            <p className="eyebrow">Recall helper</p>
            <h2 id="recall-title" className="display-md">
              {t('recall.title')}
            </h2>
          </div>
          <button className="recall-sheet__close" type="button" onClick={resetAndClose}>
            {t('recall.close')}
          </button>
        </div>

        {sheetStep === 'intro' && (
          <div className="recall-sheet__body space-y-5">
            <p className="text-sm text-slate-600">
              {t('recall.intro')}
            </p>
            <div className="grid grid-cols-2 gap-3">
              <button className="recall-type-card" type="button" onClick={() => start('object')}>
                <span>{t('recall.object')}</span>
                <small>{t('recall.objectSub')}</small>
              </button>
              <button className="recall-type-card" type="button" onClick={() => start('person')}>
                <span>{t('recall.person')}</span>
                <small>{t('recall.personSub')}</small>
              </button>
            </div>
          </div>
        )}

        {sheetStep === 'question' && currentQuestion && (
          <div className="recall-sheet__body recall-sheet__body--with-action">
            <div className="recall-progress" aria-label={`${questionIndex + 1} of ${questions.length}`}>
              {questions.map((question, index) => (
                <span
                  key={question.key}
                  className={index <= questionIndex ? 'recall-progress__dot active' : 'recall-progress__dot'}
                />
              ))}
              <span className="recall-progress__text">{questionIndex + 1}/{questions.length}</span>
            </div>

            {isPrivateContact ? (
              <div className="recall-contact-card">
                <h3>{t('recall.privateTitle')}</h3>
                <p>{t('recall.privateDesc')}</p>
                <div className="grid grid-cols-2 gap-2">
                  <a className="btn-ghost text-sm" href="tel:">
                    {t('recall.contacts')}
                  </a>
                  <a className="btn-primary text-sm" href="https://talk.kakao.com/" target="_blank" rel="noreferrer">
                    {t('recall.kakao')}
                  </a>
                </div>
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <h3 className="text-xl font-semibold text-ink">{currentQuestion.title}</h3>
                  <p className="text-sm text-slate-500">{currentQuestion.helper}</p>
                </div>

                {currentQuestion.input === 'choice' ? (
                  <div className="flex flex-wrap gap-2">
                    {currentQuestion.choices?.map((choice) => (
                      <button
                        key={choice}
                        type="button"
                        className={`chip ${currentAnswer === choice ? 'chip-on' : ''}`}
                        onClick={() => setAnswer(choice)}
                      >
                        {choice}
                      </button>
                    ))}
                  </div>
                ) : currentQuestion.input === 'textarea' ? (
                  <textarea
                    className="input min-h-[116px]"
                    value={currentAnswer}
                    onChange={(event) => setAnswer(event.target.value)}
                    placeholder={t('recall.placeholderText')}
                  />
                ) : (
                  <input
                    className="input"
                    value={currentAnswer}
                    onChange={(event) => setAnswer(event.target.value)}
                    placeholder={t('recall.placeholderShort')}
                  />
                )}

                <div className="flex items-center justify-between gap-3">
                  <button
                    className="btn-ghost px-4 py-2 text-sm"
                    type="button"
                    disabled={questionIndex === 0}
                    onClick={() => setQuestionIndex((index) => Math.max(0, index - 1))}
                  >
                    {t('common.previous')}
                  </button>
                  <button className="btn-primary px-5 py-2 text-sm" type="button" onClick={nextQuestion}>
                    {questionIndex === questions.length - 1 ? t('recall.notRemembered') : t('common.next')}
                  </button>
                </div>
              </>
            )}

            <button className="recall-found-button" type="button" onClick={rememberNow}>
              {t('recall.remembered')}
            </button>
          </div>
        )}

        {sheetStep === 'copy' && (
          <div className="recall-sheet__body space-y-4">
            <div className="space-y-2">
              <h3 className="text-xl font-semibold text-ink">{t('recall.copyTitle')}</h3>
              <p className="text-sm text-slate-600">{t('recall.copyDesc')}</p>
            </div>
            <textarea className="input min-h-[210px] text-sm" value={promptText} readOnly />
            {copied && <p className="text-sm text-emerald-700">{t('recall.copied')}</p>}
            <button className="btn-primary w-full" type="button" onClick={copyAndOpenGemini}>
              {t('recall.copyGemini')}
            </button>
            <button className="btn-ghost w-full" type="button" onClick={() => setSheetStep('return')}>
              {t('recall.backWithWord')}
            </button>
          </div>
        )}

        {sheetStep === 'return' && (
          <div className="recall-sheet__body space-y-4">
            <div className="space-y-2">
              <h3 className="text-xl font-semibold text-ink">{t('recall.returnTitle')}</h3>
              <p className="text-sm text-slate-600">
                {t('recall.returnDesc')}
              </p>
            </div>
            <input
              className="input text-xl"
              autoFocus
              value={foundWord}
              onChange={(event) => setFoundWord(event.target.value)}
              placeholder={t('recall.foundPlaceholder')}
            />
            {foundWord.trim() && (
              <p className="rounded-lg bg-accentSoft px-4 py-3 text-sm text-accent">
                {t('recall.sayAloud', { word: foundWord.trim() })}
              </p>
            )}
            <button className="btn-primary w-full" type="button" disabled={!foundWord.trim()} onClick={finishWithWord}>
              {t('recall.insert')}
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
