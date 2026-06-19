// 회상 훈련 출제 로직 — 가중치 기반 (ML 없음)
// difficultyScore가 큰 단어를 더 자주 뽑음. 정답/오답 따라 점수 갱신.

import type { VocabularyItem } from './types';

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

// 비상시 4지선다를 채우기 위한 한국어 명사 풀 — 사용자 단어가 부족할 때만 사용
const FALLBACK_DISTRACTORS = [
  '햇살','구름','바다','숲길','바람','편지','약속','기억','추억','여행',
  '음악','책장','공원','카페','거리','하늘','별빛','달빛','계절','시간',
  '머스탱','아반떼','쏘나타','K5','그랜저','SM6','쏘렌토','카니발','스포티지','코나',
  '커피','우산','노트북','시계','카메라','연필','지갑','도시락','안경','키보드',
  '사과','바나나','포도','오렌지','수박','딸기','감자','양파','시금치','당근',
];

export function pickDistractorsFromVocab(
  all: VocabularyItem[],
  answer: VocabularyItem,
  n: number
): string[] {
  // 1) 같은 부모(LLM 추천 묶음 동기) 우선
  const sib = all.filter(
    (x) => x.id !== answer.id &&
           ((answer.parentItemId && x.parentItemId === answer.parentItemId) ||
            (!answer.parentItemId && x.parentItemId === answer.id))
  );
  const fillers = all.filter((x) => x.id !== answer.id && !sib.includes(x));
  const pool = [...sib, ...fillers];
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  const fromVocab = shuffled.slice(0, n).map((x) => x.wordText);
  if (fromVocab.length >= n) return fromVocab;

  // 2) 모자라면 한국어 명사 폴백 풀에서 채움
  const used = new Set<string>([answer.wordText, ...fromVocab]);
  const pad = FALLBACK_DISTRACTORS.filter((w) => !used.has(w)).sort(() => Math.random() - 0.5);
  return [...fromVocab, ...pad.slice(0, n - fromVocab.length)];
}
