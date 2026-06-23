// 회상 훈련 출제 로직 — 가중치 기반 (ML 없음)
// difficultyScore가 큰 단어를 더 자주 뽑음. 정답/오답 따라 점수 갱신.

import type { VocabularyItem } from './types';

// 단어 설명(contextNote) 정규화 키 — 중복 판정·단서 모호성 판정에 공통 사용.
// 공백 접기 + NFC + 소문자. 기록 화면(중복 경고)과 훈련 화면(단서 폴백)이 같은 규칙을 써야 한다.
export function noteKey(s: string | null | undefined): string {
  return (s ?? '').normalize('NFC').replace(/\s+/g, ' ').trim().toLowerCase();
}

export function pickQueue(items: VocabularyItem[], count: number): VocabularyItem[] {
  const base = items;
  if (base.length === 0) return [];
  const queue: VocabularyItem[] = [];
  const used = new Set<string>();
  for (let i = 0; i < count; i++) {
    const candidates = base.filter((x) => !used.has(x.id));
    const arr = candidates.length ? candidates : base;
    const totals = arr.reduce((s, x) => s + Math.max(0.5, x.difficultyScore), 0);
    let r = Math.random() * totals;
    let chosen = arr[arr.length - 1];
    for (const x of arr) {
      r -= Math.max(0.5, x.difficultyScore);
      if (r <= 0) { chosen = x; break; }
    }
    queue.push(chosen);
    used.add(chosen.id);
  }
  return queue;
}

export function updateScore(item: VocabularyItem, correct: boolean): VocabularyItem {
  const delta = correct ? -0.5 : 0.8;
  return {
    ...item,
    difficultyScore: Math.max(0.5, Math.min(5.0, item.difficultyScore + delta)),
    attempts: item.attempts + 1,
    successes: item.successes + (correct ? 1 : 0),
    lastTriedAt: Date.now(),
  };
}

// 사용자가 기록한 단어에서만 오답 보기를 뽑는다. 같은 묶음(LLM 추천 형제) 우선.
// 모자란 개수는 하드코딩 풀이 아니라 호출부가 내장 명사 사전(/api/distractors)에서 채운다.
export function pickDistractorsFromVocab(
  all: VocabularyItem[],
  answer: VocabularyItem,
  n: number
): string[] {
  // 같은 부모(LLM 추천 묶음 동기) 우선, 그다음 나머지 사용자 단어
  const sib = all.filter(
    (x) => x.id !== answer.id &&
           ((answer.parentItemId && x.parentItemId === answer.parentItemId) ||
            (!answer.parentItemId && x.parentItemId === answer.id))
  );
  const fillers = all.filter((x) => x.id !== answer.id && !sib.includes(x));
  const pool = [...sib, ...fillers];
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  // 정답과 같은 표기는 제외(중복 기록 대비)
  return shuffled
    .map((x) => x.wordText)
    .filter((w) => w !== answer.wordText)
    .slice(0, n);
}
