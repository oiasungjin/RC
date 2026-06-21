'use client';
// 단어 라벨(빈도·범주)을 서버 API에서 받아온다. 사전 데이터는 서버에만 있어 클라 번들에 안 실린다.
// 반환: 정규화 단어 -> DictHit. API 실패/오프라인이면 빈 맵(라벨 미상 → '사전 외' 취급).

import { normalizeWord, type DictHit } from './nounLabels';

export async function fetchWordLabels(
  words: string[],
  locale: 'ko' | 'en' | 'ja' = 'ko'
): Promise<Map<string, DictHit>> {
  const map = new Map<string, DictHit>();
  const uniq = Array.from(new Set(words.map((w) => w))).filter((w) => normalizeWord(w));
  if (uniq.length === 0) return map;
  try {
    const res = await fetch('/api/word-labels', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ words: uniq, locale }),
    });
    if (!res.ok) return map;
    const j = (await res.json()) as { labels?: Record<string, DictHit> };
    for (const [norm, hit] of Object.entries(j.labels ?? {})) map.set(norm, hit);
  } catch {
    /* 오프라인 등 — 라벨 없이 진행 */
  }
  return map;
}
