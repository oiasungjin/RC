import { createAdminClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export default async function AdminDashboard() {
  const admin = createAdminClient();

  const [{ count: userCount }, { count: vocabCount }, { count: sessionCount }] =
    await Promise.all([
      admin.from('profiles').select('*', { count: 'exact', head: true }),
      admin
        .from('vocabulary_items')
        .select('*', { count: 'exact', head: true }),
      admin
        .from('training_sessions')
        .select('*', { count: 'exact', head: true }),
    ]);

  // 감정 태그 분포 (전체)
  const { data: vocabAll } = await admin
    .from('vocabulary_items')
    .select('emotion_tags');
  const emotionCount: Record<string, number> = {};
  for (const v of vocabAll ?? []) {
    for (const t of v.emotion_tags ?? []) {
      emotionCount[t] = (emotionCount[t] ?? 0) + 1;
    }
  }
  const emotions = Object.entries(emotionCount).sort((a, b) => b[1] - a[1]);

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">관리자 대시보드</h1>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Stat label="가입자" value={userCount ?? 0} />
        <Stat label="단어 총합" value={vocabCount ?? 0} />
        <Stat label="훈련 세션" value={sessionCount ?? 0} />
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-2">감정 태그 분포</h2>
        {emotions.length === 0 && (
          <p className="text-sm text-zinc-500">데이터 없음</p>
        )}
        <ul className="space-y-1">
          {emotions.map(([tag, n]) => (
            <li key={tag} className="text-sm flex gap-2">
              <span className="w-24">{tag}</span>
              <span className="font-mono">{n}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded border p-4">
      <div className="text-xs text-zinc-500">{label}</div>
      <div className="text-3xl font-bold">{value.toLocaleString()}</div>
    </div>
  );
}
