// 단어 라벨 엔진 (기획서 2장)
// "지어내지 않는다" 원칙 — 라벨은 앱 내장 명사 사전(nouns.json)·계산·감정태그에만 근거한다.
// 외부 임상 코호트나 미수집 데이터를 추정으로 채우지 않는다. 근거가 없으면 null/'unknown'을 반환한다.
//
// 출처 태그(label source):
//   'dict'  = src/data/nouns.json (빈도 low/mid/high · 범주)
//   'calc'  = 단어 자체에서 계산(음절수)
//   'emo'   = 사용자 감정태그(emotion_tags)
//   'derive'= 범주 기반 추정(구체성) — 추정값임을 UI에서 명시

import { emotionScoreOf } from './types';

export type FreqTier = 'high' | 'mid' | 'low';
export type Valence = 'positive' | 'neutral' | 'negative';
export type Concreteness = 'concrete' | 'abstract';

// 단어 라벨(빈도·범주). 빈도 사전 자체는 서버(/api/word-labels)에 두고
// 클라이언트는 기록 단어의 라벨만 받아온다(번들 경량화). lib/wordLabels.ts 참고.
export interface DictHit {
  freq: FreqTier;
  category: string | null; // 범주 사전 히트면 범주, 빈도 폴백이면 null
}

export function normalizeWord(s: string): string {
  return s.replace(/\s+/g, '').toLowerCase();
}

// 한글 음절 블록 수(공백 제외). 라틴 단어 등은 글자 수로 폴백. 출처: calc.
export function syllableCount(word: string): number {
  const compact = word.replace(/\s+/g, '');
  const hangul = compact.match(/[가-힣]/g);
  if (hangul && hangul.length) return hangul.length;
  return compact.length;
}

// 정서가(방향) — 7점 척도 점수의 부호에서 유도. 출처: emo.
export function valenceOf(emotionTags: string[]): Valence | null {
  const s = emotionScoreOf(emotionTags);
  if (s === null) return null;
  if (s > 0.5) return 'positive';
  if (s < -0.5) return 'negative';
  return 'neutral';
}

// 감정 강도 — 7점 척도 점수의 절댓값(0~3). 평가·예측의 핵심 신호. 출처: emo.
export function intensityOf(emotionTags: string[]): number | null {
  const s = emotionScoreOf(emotionTags);
  return s === null ? null : Math.abs(s);
}

// 구체성(추정) — 사전 범주 기반. 대부분 범주는 구체물이므로,
// 추상으로 분류할 소수 범주만 명시하고 나머지는 구체로 본다. 범주가 없으면 null(미상).
// 출처: derive(추정). UI에서 '추정'으로 표기할 것.
const ABSTRACT_CATEGORIES = new Set(['색깔', '학교과목']);
export function concretenessOf(hit: DictHit | null): Concreteness | null {
  // 범주를 모르면(빈도 폴백) 구체성은 미상.
  if (!hit || !hit.category) return null;
  return ABSTRACT_CATEGORIES.has(hit.category) ? 'abstract' : 'concrete';
}

// 사람·고유명사 성격이 강한 범주(망각 위험 가중에 사용).
const PERSON_CATEGORIES = new Set([
  '가수', '운동선수', '연예인', '인물·정치인', '인물·역사',
  '인물·화가', '인물·음악가', '인물·범죄자',
]);
export function isPersonCategory(category?: string | null): boolean {
  return !!category && PERSON_CATEGORIES.has(category);
}

// 망각 위험 가중치(★, 1~5) — 기획서 2-1 매트릭스 근사.
//   개인 고유명사(친밀) ★★★★★ : 자동 식별 불가(개인 중요도 미수집) → personalImportance 데이터 필요.
//                                  여기선 추정하지 않고, 공인 인물 범주는 ★★★★로만 둔다.
//   고빈도 일반명사 ★★★★ / 저빈도 일반명사 ★★★ / 추상명사 ★★
export function forgettingRiskWeight(args: {
  freq: FreqTier | null;
  concreteness: Concreteness | null;
  category?: string | null;
}): number {
  const { freq, concreteness, category } = args;
  if (concreteness === 'abstract') return 2; // 추상명사 ★★
  if (isPersonCategory(category)) return 4; // 공인 고유명사 ★★★★ (친밀 개인명 ★★★★★는 데이터 필요)
  if (freq === 'high') return 4; // 고빈도 일반명사 ★★★★
  if (freq === 'mid') return 3.5;
  if (freq === 'low') return 3; // 저빈도 일반명사 ★★★
  return 3; // 사전 외(빈도 미상) — 주변부 어휘로 보수적 가정
}

export const FREQ_TIER_FROM_PICK: Record<string, FreqTier> = {
  high: 'high',
  mid: 'mid',
  low: 'low',
};
