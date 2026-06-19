import { createAdminClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

// 회상 보조 질문 컬럼 ↔ 라벨 매핑
const OBJECT_QUESTIONS = [
  { col: 'ans_context', label: 'Q1 마지막으로 쓴 상황' },
  { col: 'ans_meaning', label: 'Q2 비슷한 뜻의 단어' },
  { col: 'ans_visual', label: 'Q3 모습/장면' },
  { col: 'ans_first_sound', label: 'Q4 첫 소리' },
  { col: 'ans_syllables', label: 'Q5 글자 수' },
] as const;

const PERSON_QUESTIONS = [
  { col: 'ans_person_field', label: 'Q1 직업/분야' },
  { col: 'ans_person_work', label: 'Q2 작품/뉴스' },
  { col: 'ans_person_appearance', label: 'Q3 외모/분위기' },
  { col: 'ans_person_initial', label: 'Q4 글자수/초성' },
] as const;

type RecallRow = {
  id: string;
  user_id: string;
  recall_type: 'object' | 'person';
  found_word: string | null;
  resolved: boolean;
  used_llm: boolean;
  created_at: string;
  [key: string]: unknown;
};

function filled(v: unknown): boolean {
  return typeof v === 'string' && v.trim().length > 0;
}

export default async function RecallStatsPage() {
  const admin = createAdminClient();
  const { data } = await admin
    .from('recall_assist_events')
    .select('*')
    .order('created_at', { ascending: false });

  const rows = (data ?? []) as RecallRow[];
  const total = rows.length;
  const objectRows = rows.filter((r) => r.recall_type === 'object');
  const personRows = rows.filter((r) => r.recall_type === 'person');
  const resolved = rows.filter((r) => r.resolved).length;
  const usedLlm = rows.filter((r) => r.used_llm).length;

  const pct = (n: number, d: number) => (d ? Math.round((n / d) * 100) : 0);

  function questionStats(
    questions: readonly { col: string; label: string }[],
    pool: RecallRow[]
  ) {
    return questions.map((q) => {
      const count = pool.filter((r) => filled(r[q.col])).length;
      return { ...q, count, pct: pct(count, pool.length) };
    });
  }

  const objectStats = questionStats(OBJECT_QUESTIONS, objectRows);
  const personStats = questionStats(PERSON_QUESTIONS, personRows);
  const recent = rows.slice(0, 50);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">회상 단서 통계</h1>
        <p className="text-sm text-zinc-600">
          사용자가 회상 보조(설단현상 인출)에서 입력한 질문별 답변을 집계합니다.
        </p>
      </div>

      <section className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Stat label="전체 세션" value={total} />
        <Stat label="사물/단어" value={objectRows.length} />
        <Stat label="사람 이름" value={personRows.length} />
        <Stat label="단어 찾음(해결)" value={`${resolved} · ${pct(resolved, total)}%`} />
        <Stat label="LLM 사용" value={`${usedLlm} · ${pct(usedLlm, total)}%`} />
      </section>

      {total === 0 && (
        <p className="text-sm text-zinc-500">아직 기록된 회상 보조 세션이 없습니다.</p>
      )}

      {objectRows.length > 0 && (
        <QuestionTable
          title="사물/단어 찾기 — 질문별 답변률"
          subtitle={`사물 세션 ${objectRows.length}건 기준`}
          stats={objectStats}
          poolSize={objectRows.length}
        />
      )}

      {personRows.length > 0 && (
        <QuestionTable
          title="사람 이름 찾기 — 질문별 답변률"
          subtitle={`사람 세션 ${personRows.length}건 기준`}
          stats={personStats}
          poolSize={personRows.length}
        />
      )}

      {recent.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold mb-2">최근 세션 (상위 50개)</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="py-2 pr-4">기록일</th>
                <th className="py-2 pr-4">유형</th>
                <th className="py-2 pr-4">입력한 답변</th>
                <th className="py-2 pr-4">찾은 단어</th>
                <th className="py-2 pr-4">해결</th>
                <th className="py-2 pr-4">LLM</th>
              </tr>
            </thead>
            <tbody>
              {recent.map((r) => {
                const qs = r.recall_type === 'person' ? PERSON_QUESTIONS : OBJECT_QUESTIONS;
                const answers = qs
                  .filter((q) => filled(r[q.col]))
                  .map((q) => `${q.label.replace(/^Q\d\s/, '')}: ${String(r[q.col])}`);
                return (
                  <tr key={r.id} className="border-b align-top">
                    <td className="py-1 pr-4 whitespace-nowrap">
                      {new Date(r.created_at).toLocaleString()}
                    </td>
                    <td className="py-1 pr-4 whitespace-nowrap">
                      {r.recall_type === 'person' ? '사람' : '사물'}
                    </td>
                    <td className="py-1 pr-4">
                      {answers.length === 0 ? (
                        <span className="text-zinc-400">—</span>
                      ) : (
                        <ul className="space-y-0.5">
                          {answers.map((a, i) => (
                            <li key={i} className="text-zinc-700">
                              {a}
                            </li>
                          ))}
                        </ul>
                      )}
                    </td>
                    <td className="py-1 pr-4 whitespace-nowrap font-medium">
                      {r.found_word ?? <span className="text-zinc-400">—</span>}
                    </td>
                    <td className="py-1 pr-4">{r.resolved ? '✅' : '—'}</td>
                    <td className="py-1 pr-4">{r.used_llm ? '🤖' : '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
}

function QuestionTable({
  title,
  subtitle,
  stats,
  poolSize,
}: {
  title: string;
  subtitle: string;
  stats: { col: string; label: string; count: number; pct: number }[];
  poolSize: number;
}) {
  return (
    <section>
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="text-xs text-zinc-500 mb-2">{subtitle}</p>
      <ul className="space-y-2">
        {stats.map((s) => (
          <li key={s.col} className="flex items-center gap-3">
            <span className="w-40 shrink-0 text-sm">{s.label}</span>
            <div className="flex-1 h-3 rounded bg-zinc-100 overflow-hidden">
              <div className="h-full bg-zinc-800" style={{ width: `${s.pct}%` }} />
            </div>
            <span className="w-24 shrink-0 text-right font-mono text-sm">
              {s.count}/{poolSize} · {s.pct}%
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded border p-3">
      <div className="text-xs text-zinc-500">{label}</div>
      <div className="text-xl font-bold">{value}</div>
    </div>
  );
}
