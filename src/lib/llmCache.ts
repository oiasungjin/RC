// LLM 동급어 10개 응답 캐시 — 동일 단어 중복 호출(=중복 과금) 방지.
//
// 2계층 구조:
//   1) 인메모리 LRU  — 워커가 살아있는 동안만. 0설정, 콜드스타트엔 사라짐.
//   2) Supabase 영구 — llm_word_cache 테이블. 설정돼 있으면 자동 사용, 없으면 조용히 건너뜀.
//
// 캐시는 사용자별이 아니라 전역 공유다(같은 단어는 누구에게나 같은 동급어 풀).
// 따라서 RLS를 우회하는 service_role(admin) 클라이언트로만 접근하고, 키가 없으면 인메모리만 쓴다.
// 캐시 읽기/쓰기 실패는 절대 본 기능(LLM 생성)을 막지 않는다 — 모두 try/catch로 삼킨다.

import type { RelatedWord } from './types';

const TTL_MS = 1000 * 60 * 60 * 24 * 30; // 30일
const MEM_MAX = 500; // 인메모리 최대 항목 수

type MemEntry = { items: RelatedWord[]; at: number };
// Map은 삽입 순서를 보존 → 가장 오래된 키가 맨 앞. 이를 이용해 LRU 근사.
const mem = new Map<string, MemEntry>();

// "{locale}:{정규화 단어}" — route.ts의 norm()과 같은 정규화 규칙(NFC + 공백제거 + 소문자).
export function cacheKey(word: string, locale: string): string {
  const n = word.normalize('NFC').replace(/\s+/g, '').toLowerCase();
  return `${locale}:${n}`;
}

function memGet(key: string): RelatedWord[] | null {
  const e = mem.get(key);
  if (!e) return null;
  if (Date.now() - e.at > TTL_MS) {
    mem.delete(key);
    return null;
  }
  // 접근 시 맨 뒤로 재삽입 → 최근 사용 표시(LRU).
  mem.delete(key);
  mem.set(key, e);
  return e.items;
}

function memSet(key: string, items: RelatedWord[]): void {
  mem.set(key, { items, at: Date.now() });
  while (mem.size > MEM_MAX) {
    const oldest = mem.keys().next().value;
    if (oldest === undefined) break;
    mem.delete(oldest);
  }
}

const TABLE = 'llm_word_cache';

// service_role 키가 있을 때만 admin 클라이언트 생성. 동적 import로 미설정 환경에 부담 0.
async function admin() {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return null;
  try {
    const { createAdminClient } = await import('./supabase/server');
    return createAdminClient();
  } catch {
    return null;
  }
}

async function dbGet(key: string): Promise<RelatedWord[] | null> {
  try {
    const sb = await admin();
    if (!sb) return null;
    const { data, error } = await sb
      .from(TABLE)
      .select('items')
      .eq('cache_key', key)
      .maybeSingle();
    if (error || !data) return null; // 테이블 없음/네트워크 오류 → 캐시 미스로 취급
    return data.items as RelatedWord[];
  } catch {
    return null;
  }
}

async function dbSet(key: string, locale: string, word: string, items: RelatedWord[]): Promise<void> {
  try {
    const sb = await admin();
    if (!sb) return;
    await sb
      .from(TABLE)
      .upsert({ cache_key: key, locale, word, items }, { onConflict: 'cache_key' });
  } catch {
    // 캐시 쓰기 실패는 무시 — 기능에 영향 없음.
  }
}

// 캐시 조회: 인메모리 → Supabase 순. Supabase 히트면 인메모리에도 승격.
export async function getCached(key: string): Promise<RelatedWord[] | null> {
  const m = memGet(key);
  if (m) return m;
  const d = await dbGet(key);
  if (d && d.length > 0) {
    memSet(key, d);
    return d;
  }
  return null;
}

// 캐시 저장: 인메모리 + Supabase 동시. (정확히 10개일 때만 호출하는 게 호출부 책임)
export async function setCached(
  key: string,
  locale: string,
  word: string,
  items: RelatedWord[]
): Promise<void> {
  memSet(key, items);
  await dbSet(key, locale, word, items);
}
