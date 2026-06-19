import { notFound } from 'next/navigation';
import { createAdminClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export default async function UserDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const admin = createAdminClient();

  const { data: profile } = await admin
    .from('profiles')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (!profile) notFound();

  const { data: vocab } = await admin
    .from('vocabulary_items')
    .select('*')
    .eq('user_id', id)
    .order('created_at', { ascending: false });

  const { data: sessions } = await admin
    .from('training_sessions')
    .select('*')
    .eq('user_id', id)
    .order('started_at', { ascending: false })
    .limit(20);

  const total = vocab?.length ?? 0;
  const totalAnswers =
    sessions?.reduce((s, x) => s + (x.answers?.length ?? 0), 0) ?? 0;
  const correctAnswers =
    sessions?.reduce(
      (s, x) =>
        s +
        (x.answers ?? []).filter((a: { isCorrect: boolean }) => a.isCorrect)
          .length,
      0
    ) ?? 0;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">{profile.email}</h1>
        <p className="text-sm text-zinc-600">
          역할 {profile.role} · 성별 {genderLabel(profile.gender)} · 가입{' '}
          {new Date(profile.created_at).toLocaleDateString()}
        </p>
      </div>

      <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="단어" value={total} />
        <Stat label="훈련 답안" value={totalAnswers} />
        <Stat
          label="정답률"
          value={
            totalAnswers
              ? `${Math.round((correctAnswers / totalAnswers) * 100)}%`
              : '-'
          }
        />
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-2">최근 단어 (상위 50개)</h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left">
              <th className="py-2 pr-4">단어</th>
              <th className="py-2 pr-4">출처</th>
              <th className="py-2 pr-4">감정</th>
              <th className="py-2 pr-4">난이도</th>
              <th className="py-2 pr-4">시도</th>
              <th className="py-2 pr-4">기록일</th>
            </tr>
          </thead>
          <tbody>
            {(vocab ?? []).slice(0, 50).map((v) => (
              <tr key={v.id} className="border-b">
                <td className="py-1 pr-4">{v.word_text}</td>
                <td className="py-1 pr-4">{v.source}</td>
                <td className="py-1 pr-4">
                  {(v.emotion_tags ?? []).join(', ')}
                </td>
                <td className="py-1 pr-4 font-mono">
                  {Number(v.difficulty_score).toFixed(1)}
                </td>
                <td className="py-1 pr-4 font-mono">
                  {v.successes}/{v.attempts}
                </td>
                <td className="py-1 pr-4">
                  {new Date(v.created_at).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-2">최근 훈련 세션 20개</h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left">
              <th className="py-2 pr-4">시작</th>
              <th className="py-2 pr-4">문항</th>
              <th className="py-2 pr-4">정답</th>
              <th className="py-2 pr-4">정답률</th>
            </tr>
          </thead>
          <tbody>
            {(sessions ?? []).map((s) => {
              const ans = s.answers ?? [];
              const correct = ans.filter(
                (a: { isCorrect: boolean }) => a.isCorrect
              ).length;
              const rate = ans.length
                ? `${Math.round((correct / ans.length) * 100)}%`
                : '-';
              return (
                <tr key={s.id} className="border-b">
                  <td className="py-1 pr-4">
                    {new Date(s.started_at).toLocaleString()}
                  </td>
                  <td className="py-1 pr-4 font-mono">{ans.length}</td>
                  <td className="py-1 pr-4 font-mono">{correct}</td>
                  <td className="py-1 pr-4 font-mono">{rate}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>
    </div>
  );
}

function genderLabel(g: string | null | undefined): string {
  if (g === 'male') return '남';
  if (g === 'female') return '여';
  if (g === 'unspecified') return '응답 안 함';
  return '미입력';
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded border p-3">
      <div className="text-xs text-zinc-500">{label}</div>
      <div className="text-xl font-bold">{value}</div>
    </div>
  );
}
