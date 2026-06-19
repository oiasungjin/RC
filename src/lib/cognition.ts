'use client';
// 인지 분석 엔진 (기획서 3·4·5·8장)
//
// 설계 원칙
//  - 로컬 우선: localStorage 데이터만으로도 동작. 로그인 시 서버 이력으로 보강.
//  - "지어내지 않는다": 표본이 부족한 축은 점수를 만들지 않고 null(=데이터 필요)로 둔다.
//  - 언어 비의존: 이 모듈은 숫자·enum·코드만 반환. 사람이 읽는 문구는 페이지(i18n)에서 매핑.
//  - 모든 점수는 0~100, 높을수록 양호. 각 지표는 source(출처)·sampleN(표본수)을 함께 반환.
//
// Phase 0(현 단계): 라벨 부착 + 개인 내 추세 + 규칙기반 플래그.
//  또래 비교(백분위)는 사용자 표본이 쌓이기 전이라 '참고용'으로만 노출(기획서 4·7장).

import type { VocabularyItem, TrainingSession } from './types';
import {
  listVocab,
  listSessions,
  getRecallQueue,
  getSynPickQueue,
  getWordHistoryCounts,
} from './storage';
import type { RecallAssistEvent, SynonymPick } from './sync';
import {
  syllableCount,
  valenceOf,
  intensityOf,
  concretenessOf,
  forgettingRiskWeight,
  normalizeWord,
  type DictHit,
  type FreqTier,
  type Valence,
  type Concreteness,
} from './nounLabels';

// ---------- 데이터셋 ----------

export interface CognitionDataset {
  vocab: VocabularyItem[];
  sessions: TrainingSession[];
  recall: RecallAssistEvent[];
  picks: SynonymPick[];
  historyCounts: Record<string, number>;
  fromServer: boolean;
}

// 같은 훈련이 세션 2개로 중복 저장된 경우(StrictMode effect 2회) 제거.
// 쌍둥이는 id만 다르고 시작시각·답변 내용이 동일하므로 그 시그니처로 중복 판정.
function dedupeSessions(sessions: TrainingSession[]): TrainingSession[] {
  const seen = new Set<string>();
  const out: TrainingSession[] = [];
  for (const s of sessions) {
    const a0 = s.answers?.[0];
    const sig = `${s.startedAt}|${s.answers?.length ?? 0}|${a0?.itemId ?? ''}|${a0?.createdAt ?? ''}|${a0?.timeMs ?? ''}`;
    if (seen.has(sig)) continue;
    seen.add(sig);
    out.push(s);
  }
  return out;
}

// 로컬에서 즉시(동기) 수집 — 첫 페인트용.
export function collectLocalDataset(): CognitionDataset {
  return {
    vocab: listVocab(),
    sessions: dedupeSessions(listSessions()),
    recall: getRecallQueue(),
    picks: getSynPickQueue(),
    historyCounts: getWordHistoryCounts(),
    fromServer: false,
  };
}

// 로그인 시 서버 이력으로 보강(회상/유사어 이벤트는 동기화되면 로컬 큐가 비므로 서버가 1차 출처).
export async function enrichWithServer(local: CognitionDataset): Promise<CognitionDataset> {
  try {
    const sync = await import('./sync');
    // 단어·세션도 서버에서 직접 조회 — localStorage가 비어 있어도 분석 가능하게.
    const [recall, picks, vocab, sessions] = await Promise.all([
      sync.fetchRecallAssistEvents(),
      sync.fetchSynonymPicks(),
      sync.fetchVocab(),
      sync.fetchSessions(),
    ]);
    if (!recall.length && !picks.length && !vocab.length && !sessions.length) return local;
    return {
      ...local,
      vocab: mergeByIdLoose(local.vocab, vocab),
      sessions: dedupeSessions(mergeByIdLoose(local.sessions, sessions)),
      recall: mergeByIdLoose(local.recall, recall),
      picks: mergeByIdLoose(local.picks, picks),
      fromServer: true,
    };
  } catch {
    return local;
  }
}

function mergeByIdLoose<T extends { id: string }>(a: T[], b: T[]): T[] {
  const map = new Map<string, T>();
  for (const x of a) map.set(x.id, x);
  for (const x of b) map.set(x.id, x);
  return [...map.values()];
}

// ---------- 공통 수치 유틸 ----------

const clamp = (x: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, x));
const mean = (xs: number[]) => (xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : 0);
function median(xs: number[]): number {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

// ---------- 라벨이 붙은 단어 ----------

export interface LabeledWord {
  id: string;
  word: string;
  norm: string;
  freq: FreqTier | null;
  category: string | null;
  syllables: number;
  concreteness: Concreteness | null;
  valence: Valence | null;
  intensity: number | null; // 감정 강도 0~3 (|점수|)
  riskWeight: number;
  nameKind: NameKind; // 메모로 본 사람 이름 종류: 친밀(고빈도)/일반(저빈도)/이름 아님
  attempts: number;
  successes: number;
  failRate: number | null; // attempts>0일 때만
  recordCount: number;     // word_history 기준 반복 기록 횟수
  createdAt: number;
}

// 메모로 "사람 이름인지 + 가까운 사람인지"를 판정.
//   친밀(엄마·아빠·자녀·배우자·가족·친한친구) → 고빈도, 그 외 사람 이름 → 저빈도(기본).
// 친밀: 본인 직계가족·배우자·친한친구를 가리키는 표현(엄마/아빠/배우자는 보통 본인 것).
const INTIMATE_WORDS = [
  '엄마', '어머니', '아빠', '아버지', '남편', '아내', '부인', '와이프',
  '내딸', '내아들', '우리딸', '우리아들', '우리아이', '우리가족', '우리엄마', '우리아빠',
  '친한친구', '절친', '베프', '막내', '첫째', '둘째',
];
// 일반 사람 이름 신호(친밀이 아닌). "계형이 딸" 처럼 남의 자녀도 여기.
const PERSON_WORDS = [
  '딸', '아들', '자녀', '손주', '손자', '손녀', '이웃', '친구', '가족', '형', '누나',
  '오빠', '언니', '동생', '조카', '지인', '삼촌', '이모', '고모', '사촌', '동료', '후배',
  '선배', '제자', '친척', '동기', '선생님', '할머니', '할아버지', '며느리', '사위',
  '형수', '매형', '장모', '장인', '제수',
];
export type NameKind = 'intimate' | 'person' | null;
function nameKindOf(note?: string): NameKind {
  if (!note) return null;
  const n = note.replace(/\s+/g, ''); // "우리 딸" → "우리딸" 매칭
  if (INTIMATE_WORDS.some((k) => n.includes(k))) return 'intimate';
  if (PERSON_WORDS.some((k) => n.includes(k))) return 'person';
  return null;
}

export function labelWords(ds: CognitionDataset, labels: Map<string, DictHit>): LabeledWord[] {
  return ds.vocab
    .filter((v) => v.source === 'user_input')
    .map((v) => {
      const norm = normalizeWord(v.wordText);
      const hit = labels.get(norm) ?? null; // 서버에서 받은 라벨(빈도·범주)
      const concreteness = concretenessOf(hit);
      const attempts = v.attempts ?? 0;
      const successes = v.successes ?? 0;
      const intensity = intensityOf(v.emotionTags);
      // 망각위험 가중 = 라벨 기반 위험 + 감정 강도 보정(강하게 각성된 단어를 잊을수록 위험↑).
      const baseRisk = forgettingRiskWeight({
        freq: hit?.freq ?? null,
        concreteness,
        category: hit?.category,
      });
      return {
        id: v.id,
        word: v.wordText,
        norm,
        freq: hit?.freq ?? null,
        category: hit?.category ?? null,
        syllables: syllableCount(v.wordText),
        concreteness,
        valence: valenceOf(v.emotionTags),
        intensity,
        riskWeight: baseRisk + (intensity ?? 0) * 0.25, // 최대 +0.75
        // 메모로 사람 이름 여부·친밀도 판정(사전 단어여도 덮어씀).
        nameKind: nameKindOf(v.contextNote),
        attempts,
        successes,
        failRate: attempts > 0 ? 1 - successes / attempts : null,
        recordCount: Math.max(1, ds.historyCounts[norm] ?? 0),
        createdAt: v.createdAt,
      };
    });
}

// ---------- 5대 인지 축 ----------

export type AxisKey =
  | 'forgetQuality' // ① 망각의 질
  | 'retrieval'     // ② 인출 효율
  | 'semantic'      // ③ 의미기억·억제
  | 'consolidation' // ④ 응고화
  | 'context';      // ⑤ 맥락·메타

// 출처 코드(페이지에서 i18n 매핑).
export type SourceCode = 'training' | 'recall' | 'picks' | 'labels' | 'time' | 'cue' | 'history';

export interface AxisResult {
  key: AxisKey;
  score: number | null; // null = 데이터 필요
  sampleN: number;
  sources: SourceCode[];
  // 부분 결손 표시용(예: 인출효율에서 설단 데이터 없음)
  missing: string[]; // 코드 배열, 페이지에서 i18n 매핑
}

// 비훈련 모델 최소 표본 — 인지 점수는 "기록 단어 + 회상/유사어/메타 행동"에서만 산출.
const MIN = {
  forgetWords: 3, // 기록 단어 최소수(①)
  retrievalRecall: 3, // 회상 이벤트(②)
  semanticPicks: 4, // 유사어 선택(③)
  consolidationWords: 5, // 기록 단어(④ 반복 망각)
  metaCues: 3, // 회상단서 자기예측(⑤)
};

// 훈련 응답 평탄화
interface FlatAnswer {
  correct: boolean;
  timeMs: number;
  usedHint: boolean;
  createdAt: number;
}
function flatAnswers(ds: CognitionDataset): FlatAnswer[] {
  const out: FlatAnswer[] = [];
  for (const s of ds.sessions) {
    for (const a of s.answers ?? []) {
      out.push({
        correct: !!a.isCorrect,
        timeMs: a.timeMs ?? 0,
        usedHint: !!a.usedHint,
        createdAt: a.createdAt ?? s.startedAt,
      });
    }
  }
  return out;
}

// ① 망각의 질 단어별 위험값:
//   사람 이름이면(사전 단어여도 덮어씀): 친밀(엄마·아빠·자녀·가족·친한친구)=고빈도 1.0, 그 외 이름=저빈도 0.3.
//   이름이 아니면: 사전 고빈도 1.0 / 중빈도 0.6 / 저빈도 0.3, 사전 외=중빈도 0.6.
function forgetRiskOf(w: LabeledWord): number {
  if (w.nameKind === 'intimate') return 1.0; // 가까운 사람 이름 → 고빈도
  if (w.nameKind === 'person') return 0.3; // 그 외 사람 이름 → 저빈도(기본)
  if (w.freq === 'high') return 1.0;
  if (w.freq === 'mid') return 0.6;
  if (w.freq === 'low') return 0.3;
  return 0.6; // 사전 외 비인명 → 중빈도 취급
}

// ① 망각의 질 — 기록한(=떠올리기 어려웠던) 단어가 고빈도·고위험 쪽일수록 낮은 점수.
//   훈련과 무관. "무엇을 못 떠올려 기록했나" = 기록 단어의 빈도·감정강도 위험 분포로만 본다.
//   고빈도(일상어)를 자주 기록할수록 위험 ↑ → 점수 ↓.
function axisForgetQuality(words: LabeledWord[]): AxisResult {
  if (words.length < MIN.forgetWords) {
    return { key: 'forgetQuality', score: null, sampleN: words.length, sources: ['labels'], missing: [] };
  }
  const risk = mean(words.map((w) => forgetRiskOf(w)));
  return {
    key: 'forgetQuality',
    score: clamp(100 * (1 - risk)),
    sampleN: words.length,
    sources: ['labels'],
    missing: [],
  };
}

// ② 인출 효율 — 회상 보조에서 스스로 떠올리나(설단 해결) + 외부 단서(AI) 비의존.
//   훈련 응답시간은 더 이상 쓰지 않는다(회상 행동 데이터만).
function axisRetrieval(ds: CognitionDataset): AxisResult {
  const n = ds.recall.length;
  if (n < MIN.retrievalRecall) {
    return { key: 'retrieval', score: null, sampleN: n, sources: ['recall'], missing: ['tot', 'latency'] };
  }
  const resolved = ds.recall.filter((e) => e.resolved).length / n; // 스스로 떠올림
  const indep = 1 - ds.recall.filter((e) => e.usedLlm).length / n; // AI 비의존
  const score = (resolved * 0.6 + indep * 0.4) * 100;
  return {
    key: 'retrieval',
    score: clamp(score),
    sampleN: n,
    sources: ['recall'],
    missing: ['latency'], // 회상 입력 응답시간은 미수집
  };
}

// ③ 의미기억·억제 — 유사어 변별(아는것 비율) + 단서 비의존(LLM 의존 낮을수록 좋음).
function axisSemantic(ds: CognitionDataset): AxisResult {
  const components: { score: number; weight: number }[] = [];
  const missing: string[] = [];
  const sources: SourceCode[] = [];

  if (ds.picks.length >= MIN.semanticPicks) {
    const known = ds.picks.filter((p) => p.status === 'known').length;
    components.push({ score: clamp((known / ds.picks.length) * 100), weight: 0.6 });
    sources.push('picks');
  } else {
    missing.push('picks');
  }

  if (ds.recall.length >= 3) {
    const indep = 1 - ds.recall.filter((e) => e.usedLlm).length / ds.recall.length;
    components.push({ score: clamp(indep * 100), weight: 0.4 });
    sources.push('cue');
  } else {
    missing.push('cue');
  }
  // 오답 클릭(억제) 지표는 미수집 → 항상 데이터 필요로 표시.
  missing.push('distractor');

  if (components.length === 0) {
    return { key: 'semantic', score: null, sampleN: ds.picks.length, sources: ['picks'], missing };
  }
  const wsum = components.reduce((s, c) => s + c.weight, 0);
  const score = components.reduce((s, c) => s + c.score * c.weight, 0) / wsum;
  return { key: 'semantic', score: clamp(score), sampleN: ds.picks.length + ds.recall.length, sources, missing };
}

// ④ 응고화 — 같은 단어를 반복 기록(=반복 망각)할수록 낮은 점수. 훈련 무관, word_history 기준.
//   한 번 기록 후 다시 안 떠올라 재기록하면 응고화 실패 신호.
function axisConsolidation(_ds: CognitionDataset, words: LabeledWord[]): AxisResult {
  if (words.length < MIN.consolidationWords) {
    return { key: 'consolidation', score: null, sampleN: words.length, sources: ['history'], missing: ['interval'] };
  }
  // 한 번만 기록된 단어 비율 = 잘 응고화된 비율. 재기록 단어가 많을수록 ↓.
  const once = words.filter((w) => w.recordCount <= 1).length;
  return {
    key: 'consolidation',
    score: clamp((once / words.length) * 100),
    sampleN: words.length,
    sources: ['history'],
    missing: ['interval'], // 복습 간격·정밀 보유율(24h/7일)은 미기록
  };
}

// ⑤ 맥락·메타 — 회상단서 자기예측(첫소리·끝소리·글자수)이 실제와 맞는 비율 = 메타인지.
//   단어 기록 시점에 입력한 자기예측만 사용(훈련 무관). 시간대 격차는 훈련 정확도가 필요해 제거.
function axisContext(ds: CognitionDataset): AxisResult {
  let cueTotal = 0;
  let cueCorrect = 0;
  for (const v of ds.vocab) {
    const c = v.recallClueCheck;
    if (!c) continue;
    for (const k of ['firstLetterCorrect', 'lastLetterCorrect', 'letterCountCorrect'] as const) {
      if (typeof c[k] === 'boolean') {
        cueTotal++;
        if (c[k]) cueCorrect++;
      }
    }
  }
  if (cueTotal < MIN.metaCues) {
    return { key: 'context', score: null, sampleN: cueTotal, sources: ['cue'], missing: ['meta'] };
  }
  return {
    key: 'context',
    score: clamp((cueCorrect / cueTotal) * 100),
    sampleN: cueTotal,
    sources: ['cue'],
    missing: [],
  };
}

export function computeAxes(ds: CognitionDataset, words: LabeledWord[]): AxisResult[] {
  return [
    axisForgetQuality(words),
    axisRetrieval(ds),
    axisSemantic(ds),
    axisConsolidation(ds, words),
    axisContext(ds),
  ];
}

// ---------- CCI 종합점수 + 신호등 ----------

export type Band = 'good' | 'watch' | 'risk' | 'na';

export interface CCIResult {
  score: number | null; // 비결손 축 평균
  band: Band;
  coverage: number; // 점수 산출에 기여한 축 수 (0~5)
}

export function computeCCI(axes: AxisResult[]): CCIResult {
  const valid = axes.filter((a) => a.score !== null) as (AxisResult & { score: number })[];
  if (valid.length === 0) return { score: null, band: 'na', coverage: 0 };
  const score = mean(valid.map((a) => a.score));
  // 절대 기준 밴드(참고용) — 또래 백분위가 없으므로 잠정 구간.
  const band: Band = score >= 66 ? 'good' : score >= 40 ? 'watch' : 'risk';
  return { score, band, coverage: valid.length };
}

// 점수(0~100) → 신호등 밴드. 기간별 점수의 색/라벨 산출에 사용. computeCCI와 동일 구간.
export function bandFromScore(score: number | null): Band {
  if (score === null) return 'na';
  return score >= 66 ? 'good' : score >= 40 ? 'watch' : 'risk';
}

// ---------- 개인 내 추세(주간 훈련 정확도) ----------

export interface TrendPoint {
  weekStart: number; // 주 시작(ms)
  label: string;     // 'M/D'
  accuracy: number;  // 0~100
  n: number;
}

function startOfWeek(ts: number): number {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  const day = (d.getDay() + 6) % 7; // 월요일 시작
  d.setDate(d.getDate() - day);
  return d.getTime();
}

export function computeTrend(ds: CognitionDataset): { points: TrendPoint[]; deltaPct: number | null } {
  const buckets = new Map<number, { correct: number; total: number }>();
  for (const a of flatAnswers(ds)) {
    const wk = startOfWeek(a.createdAt);
    const b = buckets.get(wk) ?? { correct: 0, total: 0 };
    b.total++;
    if (a.correct) b.correct++;
    buckets.set(wk, b);
  }
  const points: TrendPoint[] = [...buckets.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([wk, b]) => {
      const d = new Date(wk);
      return {
        weekStart: wk,
        label: `${d.getMonth() + 1}/${d.getDate()}`,
        accuracy: Math.round((b.correct / b.total) * 100),
        n: b.total,
      };
    });
  // 추세 델타 = 마지막 점 − 첫 점(기준선 대비 변화).
  const deltaPct =
    points.length >= 2 ? points[points.length - 1].accuracy - points[0].accuracy : null;
  return { points, deltaPct };
}

// ---------- 기간별(주/월/년) 종합점수 추세 ----------
// 시계열 이벤트(훈련 답변·회상·유사어)를 기간 버킷으로 나눠 버킷별 CCI를 산출한다.
// 단어의 누적 시도/성공이 아니라 "그 기간의 답변"에서 단어별 실패율을 다시 계산해
// 기간에 국한된 인지 상태를 본다(전체 게이지와는 별개).

export type Granularity = 'day' | 'week' | 'month' | 'year';

interface FlatAnswerId {
  itemId: string;
  correct: boolean;
  timeMs: number;
  usedHint: boolean;
  createdAt: number;
}
function flatAnswersId(ds: CognitionDataset): FlatAnswerId[] {
  const out: FlatAnswerId[] = [];
  for (const s of ds.sessions) {
    for (const a of s.answers ?? []) {
      out.push({
        itemId: a.itemId,
        correct: !!a.isCorrect,
        timeMs: a.timeMs ?? 0,
        usedHint: !!a.usedHint,
        createdAt: a.createdAt ?? s.startedAt,
      });
    }
  }
  return out;
}

function startOfPeriod(ts: number, g: Granularity): number {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0); // 'day' → 그대로(자정)
  if (g === 'week') {
    const day = (d.getDay() + 6) % 7; // 월요일 시작
    d.setDate(d.getDate() - day);
  } else if (g === 'month') {
    d.setDate(1);
  } else if (g === 'year') {
    d.setMonth(0, 1);
  }
  return d.getTime();
}
function periodLabel(ts: number, g: Granularity): string {
  const d = new Date(ts);
  if (g === 'year') return `${d.getFullYear()}`;
  if (g === 'month') return `${d.getFullYear() % 100}.${d.getMonth() + 1}`;
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

export interface PeriodPoint {
  key: number;
  label: string;
  cci: number | null;
  accuracy: number;
  n: number; // 그 기간 답변 수
  coverage: number; // 기여 축 수
  medianMs: number | null; // 그 기간 정답 응답시간 중앙값(ms)
  axes: AxisResult[]; // 그 기간의 5축 상세(탭 시 표시). 표본 부족 구간은 빈 배열.
}


export function computePeriodTrend(
  ds: CognitionDataset,
  baseWords: LabeledWord[],
  g: Granularity
): { points: PeriodPoint[]; deltaCci: number | null } {
  const answers = flatAnswersId(ds);
  const userVocab = ds.vocab.filter((v) => v.source === 'user_input');

  // 기간 키 = 기록 단어 시점 ∪ 훈련 답변 시점(둘 다 활동이 있던 구간을 모두 표시).
  const keys = new Set<number>();
  for (const w of baseWords) keys.add(startOfPeriod(w.createdAt, g));
  for (const a of answers) keys.add(startOfPeriod(a.createdAt, g));

  const points: PeriodPoint[] = [];
  for (const k of [...keys].sort((a, b) => a - b)) {
    const inK = (ts: number) => startOfPeriod(ts, g) === k;

    // 비훈련 인지(종합점수): 그 기간에 기록된 단어 + 그 기간 회상/유사어/단어(메타).
    const pWords = baseWords.filter((w) => inK(w.createdAt));
    const periodDs: CognitionDataset = {
      ...ds,
      vocab: userVocab.filter((v) => inK(v.createdAt)),
      recall: ds.recall.filter((e) => inK(e.createdAt)),
      picks: ds.picks.filter((p) => inK(p.createdAt)),
    };
    const axes = computeAxes(periodDs, pWords);
    const res = computeCCI(axes);

    // 훈련 지표(별도 — 추세 지표 토글의 정확도·응답시간용): 그 기간 훈련 답변.
    const ans = answers.filter((a) => inK(a.createdAt));
    const accuracy = ans.length ? Math.round(mean(ans.map((a) => (a.correct ? 1 : 0))) * 100) : 0;
    const correctLat = ans.filter((a) => a.correct && a.timeMs > 0).map((a) => a.timeMs);
    const medianMs = correctLat.length ? Math.round(median(correctLat)) : null;

    points.push({
      key: k,
      label: periodLabel(k, g),
      cci: res.score,
      accuracy,
      n: pWords.length,
      coverage: res.coverage,
      medianMs,
      axes,
    });
  }

  const withCci = points.filter((p) => p.cci !== null) as (PeriodPoint & { cci: number })[];
  const deltaCci =
    withCci.length >= 2
      ? Math.round(withCci[withCci.length - 1].cci - withCci[0].cci)
      : null;
  return { points, deltaCci };
}

// ---------- 라벨별 비교 + 망각 히트맵 ----------

export interface FreqBar {
  tier: FreqTier | 'none';
  count: number;
  failRate: number | null; // 시도된 단어 기준
  triedN: number;
}

export function freqBars(words: LabeledWord[]): FreqBar[] {
  const tiers: (FreqTier | 'none')[] = ['high', 'mid', 'low', 'none'];
  return tiers.map((tier) => {
    const inTier = words.filter((w) => (w.freq ?? 'none') === tier);
    const tried = inTier.filter((w) => w.failRate !== null);
    return {
      tier,
      count: inTier.length,
      triedN: tried.length,
      failRate: tried.length ? mean(tried.map((w) => w.failRate ?? 0)) : null,
    };
  });
}

// 감정 강도 버킷 — 강함(3)·보통(2)·약함(1)·중립/없음(0).
export type IntensityBucket = 3 | 2 | 1 | 0;
export function intensityBucket(intensity: number | null): IntensityBucket {
  if (intensity === null) return 0;
  const r = Math.round(intensity);
  return (r >= 3 ? 3 : r <= 0 ? 0 : r) as IntensityBucket;
}

export interface HeatCell {
  freq: FreqTier | 'none';
  intensity: IntensityBucket;
  count: number; // 그 칸에 기록된(=떠올리기 어려웠던) 단어 수
  risk: number; // 0~1, 칸의 위치 기반 내재 위험(고빈도×강함=1 … 저빈도×중립=0 근처)
}

// 빈도 위험(0~1) — 고빈도(일상어)일수록 높음. ① 망각의 질은 이것만 사용.
function freqRisk(freq: FreqTier | 'none'): number {
  return freq === 'high' ? 1 : freq === 'mid' ? 0.6 : 0.3; // low/사전외 = 0.3
}

// 칸의 내재 위험(0~1) — 빈도·감정강도 위치로 결정(히트맵용). 데이터와 무관한 고정값.
function cellRisk(freq: FreqTier | 'none', intensity: IntensityBucket): number {
  const fr = freqRisk(freq);
  const ir = intensity / 3; // 0·1·2·3 → 0·0.33·0.66·1
  return (fr + ir) / 2;
}

// 망각 위험 히트맵 — 빈도(고/중/저/사전외) × 감정 강도(강·중·약·중립).
// 셀 값 = 그 칸에 기록된 단어 "개수"(어려웠던 단어가 그 부류에 몰린 정도).
// 색조 = 칸의 내재 위험(위치). → 위험 칸에 기록이 몰리면 진한 빨강, 안전 칸이면 진한 초록.
export function heatmap(words: LabeledWord[]): HeatCell[] {
  const tiers: (FreqTier | 'none')[] = ['high', 'mid', 'low', 'none'];
  const buckets: IntensityBucket[] = [3, 2, 1, 0]; // 강함 → 중립
  const cells: HeatCell[] = [];
  for (const freq of tiers) {
    for (const intensity of buckets) {
      const count = words.filter(
        (w) => (w.freq ?? 'none') === freq && intensityBucket(w.intensity) === intensity
      ).length;
      cells.push({ freq, intensity, count, risk: cellRisk(freq, intensity) });
    }
  }
  return cells;
}

// 기록 분포 위험도(0~100) — 기록 단어가 위험 칸에 몰린 정도. 낮을수록 안전.
export function exposureRisk(words: LabeledWord[]): number | null {
  if (!words.length) return null;
  const s = words.reduce(
    (acc, w) => acc + cellRisk(w.freq ?? 'none', intensityBucket(w.intensity)),
    0
  );
  return (s / words.length) * 100;
}

// ---------- 규칙기반 인사이트(기획서 8장: 과장 방지·근거 기반) ----------

export type InsightTone = 'good' | 'watch' | 'risk' | 'info';
export interface Insight {
  code: string;
  tone: InsightTone;
  params?: Record<string, string | number>;
}

export function buildInsights(args: {
  axes: AxisResult[];
  bars: FreqBar[];
  trendDelta: number | null;
  ds: CognitionDataset;
}): Insight[] {
  const { axes, bars, trendDelta, ds } = args;
  const out: Insight[] = [];
  const axis = (k: AxisKey) => axes.find((a) => a.key === k);

  // 고빈도(일상어) 단어를 많이 기록 = 일상어를 자주 못 떠올림(주의).
  const totalRecorded = bars.reduce((s, b) => s + b.count, 0);
  const high = bars.find((b) => b.tier === 'high');
  if (totalRecorded >= 5 && high && high.count / totalRecorded >= 0.4) {
    out.push({ code: 'highFreqRecord', tone: 'watch', params: { pct: Math.round((high.count / totalRecorded) * 100) } });
  }

  // 같은 단어 반복 기록(반복 망각) 신호.
  const cons = axis('consolidation');
  if (cons && cons.score !== null && cons.score < 60) {
    out.push({ code: 'repeatForget', tone: 'watch' });
  }

  // 회상 시 외부 단서(LLM) 의존이 높음.
  if (ds.recall.length >= 3) {
    const dep = ds.recall.filter((e) => e.usedLlm).length / ds.recall.length;
    if (dep >= 0.6) out.push({ code: 'cueDependence', tone: 'watch', params: { pct: Math.round(dep * 100) } });
  }

  // 의미기억(유사어 변별) 양호.
  const sem = axis('semantic');
  if (sem && sem.score !== null && sem.score >= 70) out.push({ code: 'goodSemantic', tone: 'good' });

  // 개인 내 추세 변화(Phase 0 1차 신호).
  if (trendDelta !== null) {
    if (trendDelta >= 8) out.push({ code: 'trendUp', tone: 'good', params: { delta: trendDelta } });
    else if (trendDelta <= -8) out.push({ code: 'trendDown', tone: 'watch', params: { delta: Math.abs(trendDelta) } });
  }

  if (out.length === 0) out.push({ code: 'baseline', tone: 'info' });
  return out.slice(0, 3);
}

// ---------- 전체 리포트 ----------

export interface CognitionReport {
  words: LabeledWord[];
  axes: AxisResult[];
  cci: CCIResult;
  trend: { points: TrendPoint[]; deltaPct: number | null };
  bars: FreqBar[];
  heat: HeatCell[];
  exposureRisk: number | null; // 기록 분포 위험도(0~100, 낮을수록 안전)
  insights: Insight[];
  userCount: number; // 또래 비교 표본(현재 본인=1)
  dictCovered: number; // 사전에서 라벨이 붙은 단어 수
  fromServer: boolean;
  hasAnyData: boolean;
}

export function analyze(ds: CognitionDataset, labels: Map<string, DictHit>): CognitionReport {
  const words = labelWords(ds, labels);
  const axes = computeAxes(ds, words);
  const cci = computeCCI(axes);
  const trend = computeTrend(ds);
  const bars = freqBars(words);
  const heat = heatmap(words);
  const exposure = exposureRisk(words);
  const insights = buildInsights({ axes, bars, trendDelta: trend.deltaPct, ds });
  const dictCovered = words.filter((w) => w.freq !== null).length;
  const hasAnyData = words.length > 0;
  return {
    words,
    axes,
    cci,
    trend,
    bars,
    heat,
    exposureRisk: exposure,
    insights,
    userCount: 1,
    dictCovered,
    fromServer: ds.fromServer,
    hasAnyData,
  };
}
