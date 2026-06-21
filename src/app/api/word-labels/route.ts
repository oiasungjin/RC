import { NextResponse } from 'next/server';
import nounsKo from '@/data/nouns.json';
import nounsEn from '@/data/nouns.en.json';
import nounsJa from '@/data/nouns.ja.json';
import wordFreqData from '@/data/wordFreq.json';

export const runtime = 'nodejs';

// 단어 라벨(빈도·범주) 서버 조회.
// 사전(nouns[.en|.ja].json + wordFreq.json)은 이 서버 라우트에서만 로드 → 클라이언트 번들에서 제외.
// POST { words: string[], locale?: 'ko'|'en'|'ja' } → { labels: { [normWord]: { freq, category } } }

type FreqTier = 'high' | 'mid' | 'low';
type Entry = { w: string; f: FreqTier };
type Locale = 'ko' | 'en' | 'ja';

function norm(s: string): string {
  return s.replace(/\s+/g, '').toLowerCase();
}

// 로케일별 정규화 단어 → {빈도, 범주}. 같은 단어가 여러 범주면 더 작은(구체적) 범주 채택.
function buildTermMap(data: unknown): Map<string, { freq: FreqTier; category: string }> {
  const CATEGORIES = (data as { categories: Record<string, Entry[]> }).categories;
  const map = new Map<string, { freq: FreqTier; category: string }>();
  const catSize: Record<string, number> = {};
  for (const [cat, entries] of Object.entries(CATEGORIES)) catSize[cat] = entries.length;
  for (const [cat, entries] of Object.entries(CATEGORIES)) {
    for (const e of entries) {
      const key = norm(e.w);
      if (!key) continue;
      const cur = map.get(key);
      if (!cur || catSize[cat] < (catSize[cur.category] ?? Infinity)) {
        map.set(key, { freq: e.f, category: cat });
      }
    }
  }
  return map;
}
const TERM_MAPS: Record<Locale, Map<string, { freq: FreqTier; category: string }>> = {
  ko: buildTermMap(nounsKo),
  en: buildTermMap(nounsEn),
  ja: buildTermMap(nounsJa),
};
function pickLocale(v: unknown): Locale {
  return v === 'en' || v === 'ja' ? v : 'ko';
}

// 빈도 폴백(40,000 등급목록 명사) — 범주 사전 미스 시 빈도만.
const FREQ_MAP = new Map<string, FreqTier>();
{
  const wf = wordFreqData as Record<FreqTier, string[]>;
  (['high', 'mid', 'low'] as FreqTier[]).forEach((f) => {
    for (const w of wf[f] ?? []) if (!FREQ_MAP.has(w)) FREQ_MAP.set(w, f);
  });
}

function lookup(
  word: string,
  termMap: Map<string, { freq: FreqTier; category: string }>
): { freq: FreqTier; category: string | null } | null {
  const key = norm(word);
  const hit = termMap.get(key);
  if (hit) return hit;
  const f = FREQ_MAP.get(key); // 빈도 폴백은 한국어 등급목록 기준(로케일 무관)
  if (f) return { freq: f, category: null };
  return null;
}

export async function POST(req: Request) {
  let body: { words?: unknown; locale?: string } = {};
  try {
    body = await req.json();
  } catch {
    /* empty */
  }
  const termMap = TERM_MAPS[pickLocale(body.locale)];
  const words = Array.isArray(body.words) ? body.words : [];
  const labels: Record<string, { freq: FreqTier; category: string | null }> = {};
  for (const w of words) {
    if (typeof w !== 'string') continue;
    const key = norm(w);
    if (!key || labels[key]) continue;
    const hit = lookup(w, termMap);
    if (hit) labels[key] = hit;
  }
  return NextResponse.json({ labels });
}
