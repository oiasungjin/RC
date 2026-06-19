import { NextResponse } from 'next/server';
import nounsData from '@/data/nouns.json';
import wordFreqData from '@/data/wordFreq.json';

export const runtime = 'nodejs';

// 단어 라벨(빈도·범주) 서버 조회.
// 사전(nouns.json + wordFreq.json)은 이 서버 라우트에서만 로드 → 클라이언트 번들에서 제외.
// POST { words: string[] } → { labels: { [normWord]: { freq, category } } }  (찾은 것만)

type FreqTier = 'high' | 'mid' | 'low';
type Entry = { w: string; f: FreqTier };
const CATEGORIES = (nounsData as { categories: Record<string, Entry[]> }).categories;

function norm(s: string): string {
  return s.replace(/\s+/g, '').toLowerCase();
}

// 정규화 단어 → {빈도, 범주}. 같은 단어가 여러 범주면 더 작은(구체적) 범주 채택.
const TERM_MAP = new Map<string, { freq: FreqTier; category: string }>();
{
  const catSize: Record<string, number> = {};
  for (const [cat, entries] of Object.entries(CATEGORIES)) catSize[cat] = entries.length;
  for (const [cat, entries] of Object.entries(CATEGORIES)) {
    for (const e of entries) {
      const key = norm(e.w);
      if (!key) continue;
      const cur = TERM_MAP.get(key);
      if (!cur || catSize[cat] < (catSize[cur.category] ?? Infinity)) {
        TERM_MAP.set(key, { freq: e.f, category: cat });
      }
    }
  }
}

// 빈도 폴백(40,000 등급목록 명사) — 범주 사전 미스 시 빈도만.
const FREQ_MAP = new Map<string, FreqTier>();
{
  const wf = wordFreqData as Record<FreqTier, string[]>;
  (['high', 'mid', 'low'] as FreqTier[]).forEach((f) => {
    for (const w of wf[f] ?? []) if (!FREQ_MAP.has(w)) FREQ_MAP.set(w, f);
  });
}

function lookup(word: string): { freq: FreqTier; category: string | null } | null {
  const key = norm(word);
  const hit = TERM_MAP.get(key);
  if (hit) return hit;
  const f = FREQ_MAP.get(key);
  if (f) return { freq: f, category: null };
  return null;
}

export async function POST(req: Request) {
  let body: { words?: unknown } = {};
  try {
    body = await req.json();
  } catch {
    /* empty */
  }
  const words = Array.isArray(body.words) ? body.words : [];
  const labels: Record<string, { freq: FreqTier; category: string | null }> = {};
  for (const w of words) {
    if (typeof w !== 'string') continue;
    const key = norm(w);
    if (!key || labels[key]) continue;
    const hit = lookup(w);
    if (hit) labels[key] = hit;
  }
  return NextResponse.json({ labels });
}
