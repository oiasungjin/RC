import { NextResponse } from 'next/server';
import nounsKo from '@/data/nouns.json';
import nounsEn from '@/data/nouns.en.json';
import nounsJa from '@/data/nouns.ja.json';

export const runtime = 'nodejs';

// POST /api/distractors { words: string[], locale?, count? }
// 회상 훈련 4지선다 오답 보기를 내장 명사 사전에서 뽑아 반환.
// 단어가 사전에 있으면 같은 카테고리 동급어 우선, 부족하면 사전 전체에서 무작위 보충.
// (하드코딩 폴백 단어 풀을 대체 — 사용자/사전과 무관한 단어가 보기로 나오지 않게 한다.)
// 응답: { distractors: { [word]: string[] }, locale }

type Entry = { w: string; f: 'low' | 'mid' | 'high' };
type Locale = 'ko' | 'en' | 'ja';

function norm(s: string): string {
  return s.normalize('NFC').replace(/\s+/g, '').toLowerCase();
}
function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

type Dict = { categories: Record<string, Entry[]>; term: Map<string, string[]>; all: string[] };
function buildDict(data: unknown): Dict {
  const categories = (data as { categories: Record<string, Entry[]> }).categories;
  const term = new Map<string, string[]>();
  const all: string[] = [];
  for (const [cat, entries] of Object.entries(categories)) {
    for (const e of entries) {
      const n = norm(e.w);
      if (!n) continue;
      all.push(e.w);
      const arr = term.get(n);
      if (arr) { if (!arr.includes(cat)) arr.push(cat); }
      else term.set(n, [cat]);
    }
  }
  return { categories, term, all };
}

const DICTS: Record<Locale, Dict> = {
  ko: buildDict(nounsKo),
  en: buildDict(nounsEn),
  ja: buildDict(nounsJa),
};
function pickLocale(v: unknown): Locale {
  return v === 'en' || v === 'ja' ? v : 'ko';
}

function distractorsFor(dict: Dict, target: string, count: number): string[] {
  const tn = norm(target);
  const seen = new Set<string>([tn]); // 정답 자기 자신 제외
  const cats = dict.term.get(tn) ?? [];

  // 1) 같은 카테고리 동급어 우선. 여러 카테고리면 가장 작은(구체적인) 것 — related-words와 동일.
  const chosen = cats
    .map((c) => ({ c, size: dict.categories[c]?.length ?? 0 }))
    .sort((a, b) => a.size - b.size)[0]?.c;
  const peers: string[] = [];
  for (const e of (chosen ? dict.categories[chosen] : []) ?? []) {
    const en = norm(e.w);
    if (seen.has(en)) continue;
    seen.add(en);
    peers.push(e.w);
  }
  shuffle(peers);
  const picked = peers.slice(0, count);

  // 2) 모자라면 사전 전체에서 무작위 보충
  if (picked.length < count) {
    const pool: string[] = [];
    for (const w of dict.all) {
      const n = norm(w);
      if (seen.has(n)) continue;
      seen.add(n);
      pool.push(w);
    }
    shuffle(pool);
    picked.push(...pool.slice(0, count - picked.length));
  }
  return picked;
}

export async function POST(req: Request) {
  let body: { words?: unknown; locale?: string; count?: number } = {};
  try { body = await req.json(); } catch {}

  const words = Array.isArray(body.words)
    ? body.words.filter((w): w is string => typeof w === 'string' && w.trim().length > 0)
    : [];
  const count = Math.max(1, Math.min(6, Number(body.count) || 3));
  const dict = DICTS[pickLocale(body.locale)];

  const distractors: Record<string, string[]> = {};
  for (const raw of words) {
    const w = raw.trim();
    if (distractors[w]) continue; // 같은 단어 중복 요청 무시
    distractors[w] = distractorsFor(dict, w, count);
  }

  return NextResponse.json({ distractors, locale: pickLocale(body.locale) });
}
