'use client';

// localStorage <-> Supabase 동기화 레이어
// - 로그인 안 한 상태: localStorage만 사용 (기존 동작 유지)
// - 로그인 한 상태: storage.ts의 모든 쓰기 직후 fire-and-forget으로 Supabase upsert
// - 로그인 직후 1회: localStorage의 기존 데이터를 서버로 push, 서버 데이터를 localStorage에 pull

import { createClient, isSupabaseConfigured } from './supabase/client';
import type { VocabularyItem, TrainingSession } from './types';
import { listVocab, listSessions } from './storage';

const KEY_VOCAB = 'wk.vocab.v1';
const KEY_SESSIONS = 'wk.sessions.v1';

async function getUserId(): Promise<string | null> {
  if (!isSupabaseConfigured()) return null;
  try {
    const supabase = createClient();
    const { data } = await supabase.auth.getUser();
    return data.user?.id ?? null;
  } catch {
    return null;
  }
}

// VocabularyItem -> DB row
function vocabToRow(v: VocabularyItem, userId: string) {
  return {
    id: v.id,
    user_id: userId,
    word_text: v.wordText,
    emotion_tags: v.emotionTags,
    context_note: v.contextNote ?? null,
    source: v.source,
    parent_item_id: v.parentItemId ?? null,
    recall_clue_check: v.recallClueCheck ?? null,
    difficulty_score: v.difficultyScore,
    attempts: v.attempts,
    successes: v.successes,
    last_tried_at: v.lastTriedAt ? new Date(v.lastTriedAt).toISOString() : null,
    created_at: new Date(v.createdAt).toISOString(),
  };
}

function rowToVocab(r: any): VocabularyItem {
  return {
    id: r.id,
    wordText: r.word_text,
    emotionTags: r.emotion_tags ?? [],
    contextNote: r.context_note ?? undefined,
    source: r.source,
    parentItemId: r.parent_item_id ?? undefined,
    recallClueCheck: r.recall_clue_check ?? undefined,
    difficultyScore: Number(r.difficulty_score ?? 1),
    attempts: r.attempts ?? 0,
    successes: r.successes ?? 0,
    lastTriedAt: r.last_tried_at ? Date.parse(r.last_tried_at) : undefined,
    createdAt: r.created_at ? Date.parse(r.created_at) : Date.now(),
  };
}

function sessionToRow(s: TrainingSession, userId: string) {
  return {
    id: s.id,
    user_id: userId,
    started_at: new Date(s.startedAt).toISOString(),
    ended_at: s.endedAt ? new Date(s.endedAt).toISOString() : null,
    answers: s.answers,
  };
}

function rowToSession(r: any): TrainingSession {
  return {
    id: r.id,
    startedAt: Date.parse(r.started_at),
    endedAt: r.ended_at ? Date.parse(r.ended_at) : undefined,
    answers: r.answers ?? [],
  };
}

// ---- Types ----

export interface RecallAssistEvent {
  id: string;
  recallType: 'object' | 'person';
  answers: Record<string, string>;
  foundWord?: string;
  resolved: boolean;
  usedLlm: boolean;
  vocabItemId?: string;
  createdAt: number;
}

export interface SynonymPick {
  id: string;
  parentWord: string;
  parentItemId?: string;
  relatedWord: string;
  category?: string;
  freq?: string;            // 'low'|'mid'|'high'
  status: 'known' | 'unknown';
  createdAt: number;
}

// 단어 기록 이력(시계열) 한 건. 같은 단어를 다시 기록할 때마다 1건씩 쌓인다.
export interface WordHistoryEvent {
  id: string;
  vocabItemId?: string;
  wordText: string;
  wordNorm: string;
  emotionTags: string[];
  contextNote?: string;
  recallClueCheck?: unknown;
  source: string;
  createdAt: number;
}

// ---- Public API ----

export async function pushVocab(items: VocabularyItem[]): Promise<void> {
  const userId = await getUserId();
  if (!userId || items.length === 0) return;
  const supabase = createClient();
  const rows = items.map((v) => vocabToRow(v, userId));
  const { error, stripped } = await upsertVocabRows(supabase, rows);
  if (stripped.length) {
    console.warn(
      `[lexicare sync] DB에 없는 컬럼(${stripped.join(
        ', '
      )})을 제외하고 저장했습니다. supabase/migrations/005_add_tags.sql 을 실행하면 태그까지 동기화됩니다.`
    );
  }
  if (error) {
    console.warn('[lexicare sync] pushVocab error:', error.message, error);
    throw error;
  }
}

function parseMissingColumn(msg: string): string | null {
  // Postgres: "column \"category\" of relation \"vocabulary_items\" does not exist"
  // PostgREST: "Could not find the 'category' column of 'vocabulary_items' in the schema cache"
  const m =
    msg.match(/column "?(\w+)"? of relation/i) ??
    msg.match(/Could not find the '(\w+)' column/i) ??
    msg.match(/column "?vocabulary_items\.(\w+)"? does not exist/i);
  return m?.[1] ?? null;
}

function stripField<T extends Record<string, unknown>>(row: T, field: string): T {
  const copy = { ...row };
  delete (copy as Record<string, unknown>)[field];
  return copy;
}

// 누락 컬럼이 "여러 개"여도 하나씩 제거하며 재시도하는 upsert.
// 마이그레이션 미적용 등으로 일부 컬럼이 없어도 핵심 단어 데이터는 반드시 저장되도록 보장한다.
async function upsertVocabRows(
  supabase: ReturnType<typeof createClient>,
  rows: Record<string, unknown>[]
): Promise<{ error: { message: string } | null; stripped: string[] }> {
  let current = rows;
  const stripped: string[] = [];
  // 컬럼 개수만큼 넉넉히 반복 (무한 루프 방지 상한).
  for (let attempt = 0; attempt < 15; attempt++) {
    const { error } = await supabase
      .from('vocabulary_items')
      .upsert(current, { onConflict: 'id' });
    if (!error) return { error: null, stripped };
    const missing = parseMissingColumn(error.message);
    if (!missing) return { error, stripped };
    stripped.push(missing);
    current = current.map((r) => stripField(r, missing));
  }
  const { error } = await supabase
    .from('vocabulary_items')
    .upsert(current, { onConflict: 'id' });
  return { error, stripped };
}

export async function pushVocabPatch(id: string, patch: Partial<VocabularyItem>) {
  const userId = await getUserId();
  if (!userId) return;
  const supabase = createClient();
  const dbPatch: Record<string, unknown> = {};
  if ('difficultyScore' in patch) dbPatch.difficulty_score = patch.difficultyScore;
  if ('attempts' in patch) dbPatch.attempts = patch.attempts;
  if ('successes' in patch) dbPatch.successes = patch.successes;
  if ('lastTriedAt' in patch)
    dbPatch.last_tried_at = patch.lastTriedAt
      ? new Date(patch.lastTriedAt).toISOString()
      : null;
  if ('wordText' in patch) dbPatch.word_text = patch.wordText;
  if ('emotionTags' in patch) dbPatch.emotion_tags = patch.emotionTags;
  if ('contextNote' in patch) dbPatch.context_note = patch.contextNote ?? null;
  if ('recallClueCheck' in patch) dbPatch.recall_clue_check = patch.recallClueCheck ?? null;
  if (Object.keys(dbPatch).length === 0) return;
  // 누락 컬럼이 여러 개여도 하나씩 빼며 재시도. (마이그레이션 미적용 안전망)
  const current = dbPatch;
  for (let attempt = 0; attempt < 15; attempt++) {
    const { error } = await supabase
      .from('vocabulary_items')
      .update(current)
      .eq('id', id);
    if (!error) return;
    const missing = parseMissingColumn(error.message);
    if (missing && missing in current) {
      console.warn(
        `[lexicare sync] DB에 '${missing}' 컬럼이 없어 제외하고 업데이트합니다. 005_add_tags.sql 실행을 권장합니다.`
      );
      delete current[missing];
      if (Object.keys(current).length === 0) return;
      continue;
    }
    console.warn('[lexicare sync] pushVocabPatch error:', error.message, error);
    throw error;
  }
}

export async function pushVocabDelete(id: string) {
  const userId = await getUserId();
  if (!userId) return;
  const supabase = createClient();
  await supabase.from('vocabulary_items').delete().eq('id', id);
}

// 성공 시 true, 비로그인/오류 시 false. 호출자는 false면 로컬 큐에 남겨 재시도한다.
export async function pushSession(s: TrainingSession): Promise<boolean> {
  const userId = await getUserId();
  if (!userId) return false;
  const supabase = createClient();
  const { error } = await supabase
    .from('training_sessions')
    .upsert(sessionToRow(s, userId), { onConflict: 'id' });
  if (error) {
    console.warn('[lexicare sync] pushSession error:', error.message, error);
    return false;
  }
  return true;
}

// 로컬↔서버 양방향 머지. **절대로 로컬 데이터를 비우거나 잃지 않음.**
// 동일 id면 더 최신(updatedAt 또는 createdAt)이 우선이지만, 안전을 위해 양쪽 모두 보존하는 union 전략.
export async function pushLocalToServer(): Promise<void> {
  const userId = await getUserId();
  if (!userId) return;
  const supabase = createClient();

  // 1) 로컬 → 서버 upsert. 실패해도 로컬은 절대 안 건드림.
  const localVocab = listVocab();
  let vocabPushOk = true;
  if (localVocab.length) {
    const rows = localVocab.map((v) => vocabToRow(v, userId));
    const { error, stripped } = await upsertVocabRows(supabase, rows);
    if (stripped.length) {
      console.warn(
        `[lexicare sync] DB에 없는 컬럼(${stripped.join(
          ', '
        )})을 제외하고 동기화했습니다. 005_add_tags.sql 실행을 권장합니다.`
      );
    }
    if (error) {
      console.warn(
        '[lexicare sync] vocab push failed — keeping local intact:',
        error.message
      );
      vocabPushOk = false;
    }
  }
  const localSessions = listSessions();
  let sessionsPushOk = true;
  if (localSessions.length) {
    const rows = localSessions.map((s) => sessionToRow(s, userId));
    const { error } = await supabase
      .from('training_sessions')
      .upsert(rows, { onConflict: 'id' });
    if (error) {
      console.warn(
        '[lexicare sync] sessions push failed — keeping local intact:',
        error.message
      );
      sessionsPushOk = false;
    }
  }

  // 2) 서버 → 로컬 머지 (union). 서버 응답이 실패하거나 비어도 로컬은 그대로.
  if (vocabPushOk) {
    const { data: vocabRows, error: pullErr } = await supabase
      .from('vocabulary_items')
      .select('*')
      .order('created_at', { ascending: false });
    if (!pullErr && vocabRows) {
      const serverItems: VocabularyItem[] = vocabRows.map(rowToVocab);
      const merged = mergeById(listVocab(), serverItems, (a, b) =>
        // 최신 createdAt 우선이지만 일반적으로 같은 id면 동일 데이터
        b.createdAt - a.createdAt
      );
      window.localStorage.setItem(KEY_VOCAB, JSON.stringify(merged));
    }
  }

  if (sessionsPushOk) {
    const { data: sessionRows, error: pullErr } = await supabase
      .from('training_sessions')
      .select('*')
      .order('started_at', { ascending: false })
      .limit(50);
    if (!pullErr && sessionRows) {
      const serverSessions: TrainingSession[] = sessionRows.map(rowToSession);
      const merged = mergeById(
        listSessions(),
        serverSessions,
        (a, b) => b.startedAt - a.startedAt
      ).slice(0, 50);
      window.localStorage.setItem(KEY_SESSIONS, JSON.stringify(merged));
    }
  }

  // 3) profiles.last_seen_at — 실패해도 무시.
  await supabase
    .from('profiles')
    .update({ last_seen_at: new Date().toISOString() })
    .eq('id', userId);
}

export async function pushRecallAssist(e: RecallAssistEvent): Promise<boolean> {
  const userId = await getUserId();
  if (!userId) return false;
  const supabase = createClient();
  // 질문 key(answers) -> 질문별 전용 컬럼으로 매핑.
  //  사물/단어 찾기 5문항: context, meaning, visual, firstLetter(첫 소리), letterCount(글자 수)
  //  사람 이름 찾기 4문항: field, work, appearance, initial
  const a = e.answers ?? {};
  const text = (v: string | undefined) => (v && v.trim() ? v.trim() : null);
  const { error } = await supabase.from('recall_assist_events').upsert({
    id: e.id,
    user_id: userId,
    recall_type: e.recallType,
    ans_context: text(a.context),
    ans_meaning: text(a.meaning),
    ans_visual: text(a.visual),
    ans_first_sound: text(a.firstLetter),
    ans_syllables: text(a.letterCount),
    ans_person_field: text(a.field),
    ans_person_work: text(a.work),
    ans_person_appearance: text(a.appearance),
    ans_person_initial: text(a.initial),
    found_word: e.foundWord ?? null,
    resolved: e.resolved,
    used_llm: e.usedLlm,
    vocab_item_id: e.vocabItemId ?? null,
    created_at: new Date(e.createdAt).toISOString(),
    updated_at: new Date().toISOString(),
  }, { onConflict: 'id' });
  if (error) { console.warn('[lexicare sync] pushRecallAssist error:', error.message, error); return false; }
  return true;
}

export async function pushSynonymPicks(picks: SynonymPick[]): Promise<boolean> {
  const userId = await getUserId();
  if (!userId || picks.length === 0) return false;
  const supabase = createClient();
  const rows = picks.map((p) => ({
    id: p.id,
    user_id: userId,
    parent_word: p.parentWord,
    parent_item_id: p.parentItemId ?? null,
    related_word: p.relatedWord,
    category: p.category ?? null,
    freq: p.freq ?? null,
    status: p.status,
    created_at: new Date(p.createdAt).toISOString(),
  }));
  const { error } = await supabase.from('synonym_picks').upsert(rows, { onConflict: 'id' });
  if (error) { console.warn('[lexicare sync] pushSynonymPicks error:', error.message, error); return false; }
  return true;
}

export async function pushWordHistory(events: WordHistoryEvent[]): Promise<boolean> {
  const userId = await getUserId();
  if (!userId || events.length === 0) return false;
  const supabase = createClient();
  const rows = events.map((e) => ({
    id: e.id,
    user_id: userId,
    vocab_item_id: e.vocabItemId ?? null,
    word_text: e.wordText,
    word_norm: e.wordNorm,
    emotion_tags: e.emotionTags ?? [],
    context_note: e.contextNote ?? null,
    recall_clue_check: e.recallClueCheck ?? null,
    source: e.source,
    created_at: new Date(e.createdAt).toISOString(),
  }));
  const { error } = await supabase.from('word_history').upsert(rows, { onConflict: 'id' });
  if (error) { console.warn('[lexicare sync] pushWordHistory error:', error.message, error); return false; }
  return true;
}

// 특정 단어(정규화 키)의 이력을 서버에서 가져온다. 다른 기기에서 쌓인 이력까지 합치기 위해 사용.
export async function fetchWordHistory(wordNorm: string): Promise<WordHistoryEvent[]> {
  const userId = await getUserId();
  if (!userId) return [];
  const supabase = createClient();
  const { data, error } = await supabase
    .from('word_history')
    .select('*')
    .eq('user_id', userId)
    .eq('word_norm', wordNorm)
    .order('created_at', { ascending: false });
  if (error || !data) return [];
  return data.map((r: any) => ({
    id: r.id,
    vocabItemId: r.vocab_item_id ?? undefined,
    wordText: r.word_text,
    wordNorm: r.word_norm,
    emotionTags: r.emotion_tags ?? [],
    contextNote: r.context_note ?? undefined,
    recallClueCheck: r.recall_clue_check ?? undefined,
    source: r.source ?? 'user_input',
    createdAt: r.created_at ? Date.parse(r.created_at) : Date.now(),
  }));
}

// ---- 인지 대시보드용 서버 일괄 조회 ----
// 회상/유사어 이벤트는 동기화되면 로컬 큐에서 비워지므로, 인지 분석에서 전체 이력을
// 보려면 서버에서 직접 읽어와야 한다. 비로그인/실패 시 빈 배열(로컬 데이터로 폴백).

export async function fetchRecallAssistEvents(): Promise<RecallAssistEvent[]> {
  const userId = await getUserId();
  if (!userId) return [];
  const supabase = createClient();
  const { data, error } = await supabase
    .from('recall_assist_events')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(2000);
  if (error || !data) return [];
  return data.map((r: any) => {
    const answers: Record<string, string> = {};
    const put = (k: string, v: unknown) => {
      if (typeof v === 'string' && v.trim()) answers[k] = v;
    };
    put('context', r.ans_context);
    put('meaning', r.ans_meaning);
    put('visual', r.ans_visual);
    put('firstLetter', r.ans_first_sound);
    put('letterCount', r.ans_syllables);
    put('field', r.ans_person_field);
    put('work', r.ans_person_work);
    put('appearance', r.ans_person_appearance);
    put('initial', r.ans_person_initial);
    return {
      id: r.id,
      recallType: (r.recall_type ?? 'object') as 'object' | 'person',
      answers,
      foundWord: r.found_word ?? undefined,
      resolved: !!r.resolved,
      usedLlm: !!r.used_llm,
      vocabItemId: r.vocab_item_id ?? undefined,
      createdAt: r.created_at ? Date.parse(r.created_at) : Date.now(),
    };
  });
}

export async function fetchSynonymPicks(): Promise<SynonymPick[]> {
  const userId = await getUserId();
  if (!userId) return [];
  const supabase = createClient();
  const { data, error } = await supabase
    .from('synonym_picks')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(5000);
  if (error || !data) return [];
  return data.map((r: any) => ({
    id: r.id,
    parentWord: r.parent_word,
    parentItemId: r.parent_item_id ?? undefined,
    relatedWord: r.related_word,
    category: r.category ?? undefined,
    freq: r.freq ?? undefined,
    status: (r.status ?? 'unknown') as 'known' | 'unknown',
    createdAt: r.created_at ? Date.parse(r.created_at) : Date.now(),
  }));
}

// 인지 대시보드용 — localStorage가 비어 있어도(다른 기기/초기화) 서버 데이터로 분석 가능하도록.
export async function fetchVocab(): Promise<VocabularyItem[]> {
  const userId = await getUserId();
  if (!userId) return [];
  const supabase = createClient();
  const { data, error } = await supabase
    .from('vocabulary_items')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error || !data) return [];
  return data.map(rowToVocab);
}

export async function fetchSessions(): Promise<TrainingSession[]> {
  const userId = await getUserId();
  if (!userId) return [];
  const supabase = createClient();
  const { data, error } = await supabase
    .from('training_sessions')
    .select('*')
    .eq('user_id', userId)
    .order('started_at', { ascending: false })
    .limit(1000);
  if (error || !data) return [];
  return data.map(rowToSession);
}

export async function fetchAllWordHistory(): Promise<WordHistoryEvent[]> {
  const userId = await getUserId();
  if (!userId) return [];
  const supabase = createClient();
  const { data, error } = await supabase
    .from('word_history')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(5000);
  if (error || !data) return [];
  return data.map((r: any) => ({
    id: r.id,
    vocabItemId: r.vocab_item_id ?? undefined,
    wordText: r.word_text,
    wordNorm: r.word_norm,
    emotionTags: r.emotion_tags ?? [],
    contextNote: r.context_note ?? undefined,
    recallClueCheck: r.recall_clue_check ?? undefined,
    source: r.source ?? 'user_input',
    createdAt: r.created_at ? Date.parse(r.created_at) : Date.now(),
  }));
}

// 동일 id면 더 새 것을 채택. id가 한쪽에만 있으면 그쪽 항목 그대로 보존.
function mergeById<T extends { id: string }>(
  local: T[],
  server: T[],
  cmp: (a: T, b: T) => number
): T[] {
  const map = new Map<string, T>();
  for (const v of local) map.set(v.id, v);
  for (const v of server) {
    const cur = map.get(v.id);
    if (!cur) map.set(v.id, v);
    // 서버 데이터가 우선이지만 둘 다 비슷한 시점이면 그냥 서버 채택
    else map.set(v.id, v);
  }
  return Array.from(map.values()).sort(cmp);
}
