import { NextResponse } from 'next/server';
import nounsKo from '@/data/nouns.json';
import nounsEn from '@/data/nouns.en.json';
import nounsJa from '@/data/nouns.ja.json';
import { genRelatedTen } from '@/lib/llm';

export const runtime = 'nodejs';

// POST /api/related-words { targetWord: string, locale?: 'ko'|'en'|'ja' }
// LLM·DB 미사용 — 앱 내장 명사 사전(src/data/nouns[.en|.ja].json)에서 같은 분류 동급어 10개 반환.
// locale 별 전용 사전 사용(미지정/미지원 시 'ko'). 지역의존 콘텐츠(드라마/가수/영화 등)는 로케일별로 다름.
// 빈도 분배: 저빈도(low) 4 · 중빈도(mid) 3 · 고빈도(high) 3 (부족하면 다른 빈도로 채움).
// 응답: { targetWord, items:[{word,type,reason,freq}], category, notFound, source:'bundle' }

type Entry = { w: string; f: 'low' | 'mid' | 'high' };
type Locale = 'ko' | 'en' | 'ja';

function norm(s: string): string {
  // NFC 정규화 필수: nouns.json은 NFC로 저장돼 있는데, 입력이 NFD(분해형 한글)로 들어오면
  // 정규화 없이는 같은 글자도 매칭에 실패해 사전 조회가 전부 빗나간다.
  return s.normalize('NFC').replace(/\s+/g, '').toLowerCase();
}
function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

type Dict = { categories: Record<string, Entry[]>; term: Map<string, string[]> };
function buildDict(data: unknown): Dict {
  const categories = (data as { categories: Record<string, Entry[]> }).categories;
  const term = new Map<string, string[]>();
  for (const [cat, entries] of Object.entries(categories)) {
    for (const e of entries) {
      const n = norm(e.w);
      if (!n) continue;
      const arr = term.get(n);
      if (arr) { if (!arr.includes(cat)) arr.push(cat); }
      else term.set(n, [cat]);
    }
  }
  return { categories, term };
}

// 모듈 로드 시 1회: 로케일별 사전 구축
const DICTS: Record<Locale, Dict> = {
  ko: buildDict(nounsKo),
  en: buildDict(nounsEn),
  ja: buildDict(nounsJa),
};
function pickLocale(v: unknown): Locale {
  return v === 'en' || v === 'ja' ? v : 'ko';
}

const TARGET: Record<Entry['f'], number> = { low: 4, mid: 3, high: 3 };

// 저4·중3·고3 비율로 10개 선택, 모자라면 남은 것에서 채움
function pickByFreq(peers: Entry[]): Entry[] {
  const buckets: Record<Entry['f'], Entry[]> = { low: [], mid: [], high: [] };
  for (const p of peers) (buckets[p.f] ?? buckets.mid).push(p);
  (Object.keys(buckets) as Entry['f'][]).forEach((k) => shuffle(buckets[k]));

  const picked: Entry[] = [];
  (['low', 'mid', 'high'] as Entry['f'][]).forEach((tier) => {
    picked.push(...buckets[tier].splice(0, TARGET[tier]));
  });
  if (picked.length < 10) {
    const leftover = shuffle([...buckets.low, ...buckets.mid, ...buckets.high]);
    picked.push(...leftover.slice(0, 10 - picked.length));
  }
  return shuffle(picked).slice(0, 10);
}

export async function POST(req: Request) {
  let body: { targetWord?: string; locale?: string } = {};
  try { body = await req.json(); } catch {}
  const target = (body.targetWord || '').trim();
  if (!target) return NextResponse.json({ error: 'targetWord required' }, { status: 400 });

  const locale = pickLocale(body.locale);
  const { categories: CATEGORIES, term: TERM_TO_CATS } = DICTS[locale];

  const tn = norm(target);
  const cats = TERM_TO_CATS.get(tn);
  if (!cats || cats.length === 0) {
    // 내장 사전에 없는 단어 → LLM으로 동급어 10개 생성.
    // ANTHROPIC_API_KEY 미설정 시 데모 풀에서 10개 반환(placeholder=true) — 어떤 경우든 빈 결과를 내지 않는다.
    try {
      const { items, placeholder, cached } = await genRelatedTen(target, { locale });
      return NextResponse.json({
        targetWord: target,
        items,
        category: null,
        notFound: false,
        source: placeholder ? 'placeholder' : cached ? 'llm-cache' : 'llm',
      });
    } catch (e) {
      return NextResponse.json(
        { targetWord: target, items: [], category: null, notFound: false, error: 'llm_failed', message: e instanceof Error ? e.message : String(e) },
        { status: 502 }
      );
    }
  }

  // 여러 카테고리면 더 작은(구체적인) 카테고리 우선
  const chosen = cats
    .map((c) => ({ c, size: CATEGORIES[c]?.length ?? 0 }))
    .sort((a, b) => a.size - b.size)[0].c;

  const peers = (CATEGORIES[chosen] || []).filter((e) => norm(e.w) !== tn);
  const items = pickByFreq(peers).map((e) => ({
    word: e.w,
    type: 'same_category_peer' as const,
    reason: chosen,
    freq: e.f,
  }));

  return NextResponse.json({ targetWord: target, items, category: chosen, notFound: false, source: 'bundle' });
}
