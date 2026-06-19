// 도메인 타입 — 사용자가 기록한 단어 + LLM 동급 유사어 + 회상 훈련

// 감정은 7점 양극 척도. 사용자는 감정 '종류'(감동…공포)로 고르지만,
// 내부 평가·예측은 각 종류에 1:1 매칭된 점수(방향+강도, +3..-3)로 처리한다.
//   방향 = 점수의 부호(긍정/중립/부정), 강도 = |점수| (0~3).
export type EmotionTag = 'moved' | 'satisfied' | 'calm' | 'neutral' | 'worried' | 'sad' | 'fear';

export interface EmotionLevel {
  tag: EmotionTag;
  label: string;
  emoji: string;
  score: number; // +3(매우좋음) … 0(중립) … -3(매우싫음)
}

// 좋음(+3) → 싫음(-3) 순서. 기록·표시·정렬이 이 순서를 따른다.
export const EMOTIONS: EmotionLevel[] = [
  { tag: 'moved', label: '감동', emoji: '😍', score: 3 },
  { tag: 'satisfied', label: '만족', emoji: '😊', score: 2 },
  { tag: 'calm', label: '편안함', emoji: '😌', score: 1 },
  { tag: 'neutral', label: '중립', emoji: '😐', score: 0 },
  { tag: 'worried', label: '걱정', emoji: '😟', score: -1 },
  { tag: 'sad', label: '슬픔', emoji: '😢', score: -2 },
  { tag: 'fear', label: '공포', emoji: '😨', score: -3 },
];

// 과거 7종류(즐거움/기쁨/편안함/중립/슬픔/두려움/분노) → 새 척도 별칭. 기존 기록 호환.
export const LEGACY_EMOTION_ALIAS: Record<string, EmotionTag> = {
  pleasure: 'satisfied',
  joy: 'satisfied',
  comfort: 'calm',
  anger: 'fear', // 분노=고각성 강한 부정 → 공포(-3) 버킷
  // sad/fear/neutral은 키가 같아 그대로 해석됨.
};

// 키(신규 또는 레거시) → EmotionLevel. 모르는 키면 undefined.
export function resolveEmotion(tag: string): EmotionLevel | undefined {
  return (
    EMOTIONS.find((e) => e.tag === tag) ??
    EMOTIONS.find((e) => e.tag === LEGACY_EMOTION_ALIAS[tag])
  );
}

// 키 → 점수(+3..-3). 모르는 키면 null.
export function emotionScore(tag: string): number | null {
  return resolveEmotion(tag)?.score ?? null;
}

// 단어에 붙은 감정들의 대표 점수 — 단일선택이라 보통 1개, 여러 개면 평균. 없으면 null.
export function emotionScoreOf(tags: string[]): number | null {
  const scores = (tags ?? [])
    .map(emotionScore)
    .filter((s): s is number => s !== null);
  if (!scores.length) return null;
  return scores.reduce((a, b) => a + b, 0) / scores.length;
}

export type KnowledgeStatus = 'known' | 'unknown';
export type ItemSource = 'user_input' | 'llm_suggested';

export interface RecallClueCheck {
  firstLetterAnswer?: string;
  lastLetterAnswer?: string;
  letterCountAnswer?: string;
  firstLetterCorrect?: boolean;
  lastLetterCorrect?: boolean;
  letterCountCorrect?: boolean;
  allCorrect?: boolean;
}

export interface VocabularyItem {
  id: string;
  wordText: string;
  emotionTags: EmotionTag[];
  contextNote?: string;
  source: ItemSource;
  parentItemId?: string;            // llm_suggested일 때 어떤 단어에서 나왔는지
  recallClueCheck?: RecallClueCheck;
  createdAt: number;
  // 회상 훈련 가중치
  difficultyScore: number;          // 기본 1.0, 실패 ↑ / 성공 ↓
  attempts: number;
  successes: number;
  lastTriedAt?: number;
}

export interface RelatedWord {
  word: string;
  type: 'same_category_peer';
  reason: string;                   // 8~20자 짧은 설명
}

export interface TrainingAnswer {
  itemId: string;
  promptType: 'cloze' | 'choice';
  userAnswer: string;
  isCorrect: boolean;
  timeMs: number;
  usedHint: boolean;
  createdAt: number;
}

export interface TrainingSession {
  id: string;
  startedAt: number;
  endedAt?: number;
  answers: TrainingAnswer[];
}
