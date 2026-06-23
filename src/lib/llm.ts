// Anthropic SDK 래퍼 — 입력 단어와 같은 카테고리의 동등한 위치 단어 10개 생성
// 핵심 보장:
//   - 정확히 10개
//   - 한국어
//   - targetWord 자기 자신 제외
//   - 중복 제거
//   - 실패 시 1회 재시도
// API 키 미설정 시 빈 결과 반환 (placeholder=true) — 화면에서 안내문구를 띄운다.

import type Anthropic from '@anthropic-ai/sdk';
import type { RelatedWord } from './types';
import { cacheKey, getCached, setCached } from './llmCache';

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

const SYSTEM =`당신은 한국어 어휘 의미망과 카테고리 분류에 정통한 전문가입니다.
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
  cached?: boolean;           // true → 캐시 히트 (LLM 미호출)
}

export interface GenOptions {
  hint?: string;
  locale?: string;            // 캐시 키 분리용. 미지정 시 'ko'.
}

export async function genRelatedTen(targetWord: string, opts: GenOptions = {}): Promise<RelatedTenResult> {
  const { hint, locale = 'ko' } = opts;
  const cli = await client();
  if (!cli) {
    // LLM 미연결(키 없음) → 더미를 만들지 않고 빈 결과 반환. 화면에서 안내문구를 띄운다.
    return { items: [], placeholder: true };
  }

  // 캐시 조회 — 정확히 10개 저장된 항목만 신뢰.
  const key = cacheKey(targetWord, locale);
  const hit = await getCached(key);
  if (hit && hit.length === 10) {
    return { items: hit, placeholder: false, cached: true };
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

  // 정확히 10개일 때만 캐시에 저장(불완전한 결과는 캐시 오염을 막기 위해 저장 안 함).
  const done = async (items: RelatedWord[]): Promise<RelatedTenResult> => {
    if (items.length === 10) await setCached(key, locale, targetWord, items);
    return { items, placeholder: false };
  };

  try {
    const items = await tryOnce();
    if (items.length === 10) return done(items);
    const retry = await tryOnce('이전 응답이 10개가 아니었습니다. 정확히 10개로 다시 만들어 주세요.');
    const final = retry.length > items.length ? retry : items;
    return done(final);
  } catch {
    // JSON 파싱 실패 등 — 1회 재시도
    const retry = await tryOnce('JSON 형식만 정확히 출력하세요.');
    return done(retry);
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
