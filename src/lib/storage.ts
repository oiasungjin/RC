'use client';
// 로컬 저장소 — 로컬은 localStorage(JSON), 로그인 상태면 자동으로 Supabase로도 write-through.
// 페이지 코드는 동기 인터페이스 그대로 사용하면 됨. sync 호출은 fire-and-forget.

import type { VocabularyItem, TrainingSession } from './types';
import type { RecallAssistEvent, SynonymPick, WordHistoryEvent } from './sync';

const KEY_VOCAB = 'wk.vocab.v1';
const KEY_SESSIONS = 'wk.sessions.v1';

function read<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
function write<T>(key: string, value: T) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

// sync 모듈을 동적 import — SSR/SSG 빌드에서 supabase 클라이언트 초기화가 터지지 않도록.
// 실패 시 콘솔에 경고만 — 사용자 흐름은 막지 않음.
function fireSync(fn: (s: typeof import('./sync')) => Promise<unknown>) {
  if (typeof window === 'undefined') return;
  import('./sync')
    .then(fn)
    .catch((err) => {
      console.warn('[lexicare sync] write-through failed:', err);
    });
}

export function listVocab(): VocabularyItem[] {
  return read<VocabularyItem[]>(KEY_VOCAB, []);
}
export function getVocab(id: string): VocabularyItem | undefined {
  return listVocab().find((v) => v.id === id);
}

export function addVocab(items: VocabularyItem[]): VocabularyItem[] {
  const existing = listVocab();
  const byKey = new Map(existing.map((v) => [normKey(v), v]));
  const resolved: VocabularyItem[] = [];
  const newlyAdded: VocabularyItem[] = [];
  const patchedExisting: VocabularyItem[] = [];
  for (const it of items) {
    const k = normKey(it);
    const found = byKey.get(k);
    if (found) {
      // 같은 단어 재기록 — 단어 엔트리는 1행 유지하되, "최신" 스냅샷(감정·메모·회상단서)으로 갱신.
      // (시점별 이력 자체는 word_history 로 별도 append — logWordHistory 참고)
      const merged: VocabularyItem = {
        ...found,
        wordText: it.wordText || found.wordText,
        emotionTags: it.emotionTags.length ? it.emotionTags : found.emotionTags,
        contextNote: it.contextNote ?? found.contextNote,
        recallClueCheck: it.recallClueCheck ?? found.recallClueCheck,
      };
      byKey.set(k, merged);
      resolved.push(merged);
      patchedExisting.push(merged);
    } else {
      byKey.set(k, it);
      resolved.push(it);
      newlyAdded.push(it);
    }
  }
  write(KEY_VOCAB, [...byKey.values()].sort((a, b) => b.createdAt - a.createdAt));
  if (newlyAdded.length) fireSync((s) => s.pushVocab(newlyAdded));
  for (const item of patchedExisting) {
    fireSync((s) =>
      s.pushVocabPatch(item.id, {
        wordText: item.wordText,
        emotionTags: item.emotionTags,
        contextNote: item.contextNote,
        recallClueCheck: item.recallClueCheck,
      })
    );
  }
  return resolved;
}

export function updateVocab(id: string, patch: Partial<VocabularyItem>) {
  const all = listVocab();
  const idx = all.findIndex((v) => v.id === id);
  if (idx < 0) return;
  all[idx] = { ...all[idx], ...patch };
  write(KEY_VOCAB, all);
  fireSync((s) => s.pushVocabPatch(id, patch));
}

export function deleteVocab(id: string) {
  write(KEY_VOCAB, listVocab().filter((v) => v.id !== id));
  fireSync((s) => s.pushVocabDelete(id));
}

export function listSessions(): TrainingSession[] {
  return read<TrainingSession[]>(KEY_SESSIONS, []);
}
export function appendSession(s: TrainingSession) {
  const all = listSessions();
  all.unshift(s);
  write(KEY_SESSIONS, all.slice(0, 200));
  // 로컬에 먼저 영속 저장(미동기화 큐) 후 서버 push, 성공해야 큐에서 제거 → 유실 방지.
  saveSessionLocal(s);
  fireSync(async (sync) => {
    const ok = await sync.pushSession(s);
    if (ok) removeSessionLocal(s.id);
  });
}

// 훈련 세션 미동기화 재시도 큐 — 회상/유사어와 동일 패턴.
const KEY_SESSION_QUEUE = 'wk.sessions.q.v1';
const SESSION_QUEUE_MAX = 500;

export function getSessionQueue(): TrainingSession[] {
  return read<TrainingSession[]>(KEY_SESSION_QUEUE, []);
}
function saveSessionLocal(s: TrainingSession) {
  const q = getSessionQueue().filter((x) => x.id !== s.id);
  q.push(s);
  write(KEY_SESSION_QUEUE, q.slice(-SESSION_QUEUE_MAX));
}
function removeSessionLocal(id: string) {
  write(KEY_SESSION_QUEUE, getSessionQueue().filter((x) => x.id !== id));
}
// 쌓여있던 미동기화 훈련 세션을 한 번에 재시도(로그인/부팅/online 시 호출).
export function flushSessionQueue() {
  const q = getSessionQueue();
  if (q.length === 0) return;
  fireSync(async (sync) => {
    for (const s of q) {
      const ok = await sync.pushSession(s);
      if (ok) removeSessionLocal(s.id);
    }
  });
}

const KEY_RECALL_QUEUE = 'wk.recall.q.v1';
const RECALL_QUEUE_MAX = 200;

export function getRecallQueue(): RecallAssistEvent[] {
  return read<RecallAssistEvent[]>(KEY_RECALL_QUEUE, []);
}
// 같은 세션(id)이면 교체(upsert), 아니면 추가. 최신순 유지, 상한 적용.
export function saveRecallLocal(e: RecallAssistEvent) {
  const q = getRecallQueue().filter((x) => x.id !== e.id);
  q.push(e);
  write(KEY_RECALL_QUEUE, q.slice(-RECALL_QUEUE_MAX));
}
function removeRecallLocal(id: string) {
  write(KEY_RECALL_QUEUE, getRecallQueue().filter((x) => x.id !== id));
}
// 로컬에 먼저 저장(영속) 후 서버 push 시도, 성공하면 로컬 큐에서 제거.
export function logRecallAssist(e: RecallAssistEvent) {
  saveRecallLocal(e);
  fireSync(async (s) => {
    const ok = await s.pushRecallAssist(e);
    if (ok) removeRecallLocal(e.id);
  });
}
// 쌓여있던 미동기화 회상 이벤트를 한 번에 재시도(로그인/부팅/online 시 호출).
export function flushRecallQueue() {
  const q = getRecallQueue();
  if (q.length === 0) return;
  fireSync(async (s) => {
    for (const e of q) {
      const ok = await s.pushRecallAssist(e);
      if (ok) removeRecallLocal(e.id);
    }
  });
}

const KEY_SYNPICK_QUEUE = 'wk.synpick.q.v1';
const SYNPICK_QUEUE_MAX = 500;

export function getSynPickQueue(): SynonymPick[] {
  return read<SynonymPick[]>(KEY_SYNPICK_QUEUE, []);
}
function saveSynPicksLocal(ps: SynonymPick[]) {
  const q = getSynPickQueue();
  const ids = new Set(q.map((x) => x.id));
  for (const p of ps) if (!ids.has(p.id)) q.push(p);
  write(KEY_SYNPICK_QUEUE, q.slice(-SYNPICK_QUEUE_MAX));
}
function removeSynPicksLocal(ids: string[]) {
  const s = new Set(ids);
  write(KEY_SYNPICK_QUEUE, getSynPickQueue().filter((x) => !s.has(x.id)));
}
// 로컬 큐에 먼저 저장 후 서버 push, 성공 시 큐에서 제거
export function logSynonymPicks(ps: SynonymPick[]) {
  if (!ps.length) return;
  saveSynPicksLocal(ps);
  fireSync(async (s) => {
    const ok = await s.pushSynonymPicks(ps);
    if (ok) removeSynPicksLocal(ps.map((p) => p.id));
  });
}
export function flushSynPickQueue() {
  const q = getSynPickQueue();
  if (q.length === 0) return;
  fireSync(async (s) => {
    const ok = await s.pushSynonymPicks(q);
    if (ok) removeSynPicksLocal(q.map((p) => p.id));
  });
}

// ---- 단어 기록 이력(시계열) ----
// 단어 엔트리는 1행만 유지하므로, "언제 어떤 감정/메모로 기록했는지"의 시점별 이력은 여기에 append-only로 쌓는다.
// 로컬 저장소가 타임라인 표시의 1차 출처이고, 로그인 상태면 word_history 테이블로도 동기화한다.
const KEY_HISTORY = 'wk.history.v1';
const HISTORY_MAX = 2000;

type StoredHistory = WordHistoryEvent & { synced?: boolean };

export function normalizeWord(word: string): string {
  return word.replace(/\s+/g, '').toLowerCase();
}

function getHistoryStore(): StoredHistory[] {
  return read<StoredHistory[]>(KEY_HISTORY, []);
}

// 단어(정규화 키)별 기록 횟수 맵. 대시보드 "반복 단어만 보기" 필터/배지에서 사용.
export function getWordHistoryCounts(): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const h of getHistoryStore()) {
    counts[h.wordNorm] = (counts[h.wordNorm] ?? 0) + 1;
  }
  return counts;
}

// 특정 단어(정규화 키)의 이력만 최신순으로. 타임라인 UI에서 사용.
export function listWordHistory(wordNorm: string): WordHistoryEvent[] {
  return getHistoryStore()
    .filter((h) => h.wordNorm === wordNorm)
    .sort((a, b) => b.createdAt - a.createdAt)
    .map(({ synced: _synced, ...e }) => e);
}

// 기록 시점 스냅샷 1건 추가 — 로컬에 영속 저장 후 서버로 push, 성공하면 synced 표시.
export function logWordHistory(e: WordHistoryEvent) {
  const store = getHistoryStore().filter((h) => h.id !== e.id);
  store.push({ ...e, synced: false });
  write(KEY_HISTORY, store.slice(-HISTORY_MAX));
  fireSync(async (s) => {
    const ok = await s.pushWordHistory([e]);
    if (ok) markHistorySynced([e.id]);
  });
}

function markHistorySynced(ids: string[]) {
  const set = new Set(ids);
  write(
    KEY_HISTORY,
    getHistoryStore().map((h) => (set.has(h.id) ? { ...h, synced: true } : h))
  );
}

// 미동기화 이력을 한 번에 재시도(로그인/부팅/online 시).
export function flushHistoryQueue() {
  const pending = getHistoryStore().filter((h) => !h.synced);
  if (pending.length === 0) return;
  const events = pending.map(({ synced: _synced, ...e }) => e);
  fireSync(async (s) => {
    const ok = await s.pushWordHistory(events);
    if (ok) markHistorySynced(events.map((e) => e.id));
  });
}

// 서버에서 받은 이력을 로컬 이력 저장소에 머지(다른 기기 기록 합치기). 이미 있는 id는 synced로 둔다.
export function mergeServerWordHistory(events: WordHistoryEvent[]) {
  if (!events.length) return;
  const store = getHistoryStore();
  const byId = new Map(store.map((h) => [h.id, h]));
  for (const e of events) {
    byId.set(e.id, { ...e, synced: true });
  }
  write(KEY_HISTORY, [...byId.values()].slice(-HISTORY_MAX));
}

function normKey(v: VocabularyItem) {
  return normalizeWord(v.wordText);
}

export function uid(prefix = 'v'): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}
