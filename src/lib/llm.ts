// Anthropic SDK 래퍼 — 입력 단어와 같은 카테고리의 동등한 위치 단어 10개 생성
// 핵심 보장:
//   - 정확히 10개
//   - 한국어
//   - targetWord 자기 자신 제외
//   - 중복 제거
//   - 실패 시 1회 재시도
// API 키 미설정 시 데모용 샘플 풀에서 10개를 무작위 반환 (placeholder=true).

import type Anthropic from '@anthropic-ai/sdk';
import type { RelatedWord } from './types';

const MODEL = process.env.ANTHROPIC_MODEL || 'claude-haiku-4-5-20251001';

let _client: Anthropic | null = null;
// 지연 로딩: 키가 없으면 SDK 모듈 자체를 import하지 않는다.
// (정적 import 시 webpack이 무거운 SDK를 라우트 워커에 번들하다 워커가 죽는 문제를 회피)
async function client(): Promise<Anthropic | null> {
  const k = process.env.ANTHROPIC_API_KEY;
  if (!k) return null;
  if (!_client) {
    const { default: AnthropicSDK } = await import('@anthropic-ai/sdk');
    _client = new AnthropicSDK({ apiKey: k });
  }
  return _client;
}

// 데모 모드용 한국어 명사 풀 (다양한 카테고리 혼합) — 키 미설정 시 사용
const PLACEHOLDER_POOL = [
  '햇살','구름','바다','숲길','바람','편지','약속','기억','추억','여행',
  '음악','책장','공원','카페','거리','하늘','별빛','달빛','계절','시간',
  '머스탱','아반떼','쏘나타','K5','그랜저','SM6','쏘렌토','카니발','스포티지','코나',
  '커피','우산','노트북','시계','카메라','연필','지갑','도시락','안경','키보드',
  '사과','바나나','포도','오렌지','수박','딸기','감자','양파','시금치','당근',
];

function genPlaceholder(targetWord: string): RelatedWord[] {
  const pool = PLACEHOLDER_POOL.filter((w) => w !== targetWord);
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, 10).map((word) => ({
    word,
    type: 'same_category_peer' as const,
    reason: '데모 샘플 (실제 LLM 미설정)',
  }));
}

const SYSTEM = `당신은 한국어 어휘 의미망과 카테고리 분류에 정통한 전문가입니다.
입력 단어가 속한 카테고리를 추론하고, 그 카테고리에서 "동등한 위치(같은 급/같은 역할/같은 범주)"에 있는 다른 단어 10개를 골라 JSON으로만 답합니다.
규칙:
- 동의어가 아니라 같은 카테고리의 동등 위치 후보 (예: "제네시스" → "머스탱","아반떼","K5","쏘나타" 등 자동차 모델)
- 입력 단어 자체나 매우 유사한 변형 표기는 제외
- 모든 항목은 자연스러운 한국어
- reason은 8~20자 한국어
- 정확히 10개. 중복 금지
- JSON 외 다른 텍스트 출력 금지`;

interface LLMResponse {
  items: Array<{ word: string; reason?: string }>;
}

export class LLMUnavailableError extends Error {
  constructor() { super('ANTHROPIC_API_KEY 미설정'); this.name = 'LLMUnavailableError'; }
}

export interface RelatedTenResult {
  items: RelatedWord[];
  placeholder: boolean;       // true → 데모 샘플 (키 미설정)
}

export async function genRelatedTen(targetWord: string, hint?: string): Promise<RelatedTenResult> {
  const cli = await client();
  if (!cli) {
    return { items: genPlaceholder(targetWord), placeholder: true };
  }

  const userMsg = `입력 단어: "${targetWord}"${hint ? `\n맥락 힌트: ${hint}` : ''}
이 단어가 속한 카테고리를 추론하고, 그 카테고리에서 동등한 위치의 다른 단어 10개를 한국어로 골라주세요.
정확히 다음 JSON 형식으로만 답하세요:
{"items":[{"word":"...","reason":"..."}, ... 10개 ...]}`;

  const tryOnce = async (extraNudge = ''): Promise<RelatedWord[]> => {
    const res = await cli.messages.create({
      model: MODEL,
      max_tokens: 700,
      system: [{ type: 'text', text: SYSTEM, cache_control: { type: 'ephemeral' } }],
      messages: [{ role: 'user', content: userMsg + (extraNudge ? `\n${extraNudge}` : '') }],
    });
    const txt = res.content.map((c) => (c.type === 'text' ? c.text : '')).join('');
    const m = txt.match(/\{[\s\S]*\}/);
    if (!m) throw new Error('no_json');
    const parsed = JSON.parse(m[0]) as LLMResponse;
    return sanitize(parsed, targetWord);
  };

  try {
    const items = await tryOnce();
    if (items.length === 10) return { items, placeholder: false };
    const retry = await tryOnce('이전 응답이 10개가 아니었습니다. 정확히 10개로 다시 만들어 주세요.');
    const final = retry.length > items.length ? retry : items;
    return { items: final, placeholder: false };
  } catch {
    // JSON 파싱 실패 등 — 1회 재시도
    const retry = await tryOnce('JSON 형식만 정확히 출력하세요.');
    return { items: retry, placeholder: false };
  }
}

function sanitize(parsed: LLMResponse, target: string): RelatedWord[] {
  const seen = new Set<string>();
  const out: RelatedWord[] = [];
  for (const it of parsed.items || []) {
    const w = String(it.word || '').trim().replace(/\s+/g, ' ');
    if (!w || w === target) continue;
    const key = w.toLowerCase();
    if (seen.has(key)) continue;
    if (w.length > 30) continue;
    seen.add(key);
    out.push({
      word: w,
      type: 'same_category_peer',
      reason: String(it.reason || '').trim().slice(0, 30) || '동급 후보',
    });
    if (out.length >= 10) break;
  }
  return out;
}
