import { createAdminClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export default async function AllVocabPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const sp = await searchParams;
  const q = (sp.q ?? '').trim();
  const page = Math.max(1, parseInt(sp.page ?? '1', 10) || 1);
  const pageSize = 50;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const admin = createAdminClient();
  let query = admin
    .from('vocabulary_items')
    .select(
      'id, user_id, word_text, source, emotion_tags, created_at, profiles!inner(email)',
      { count: 'exact' }
    )
    .order('created_at', { ascending: false })
    .range(from, to);

  if (q) query = query.ilike('word_text', `%${q}%`);

  const { data: rows, count } = await query;
  const total = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">전체 단어</h1>
      <form method="get" className="flex gap-2 items-center">
        <input
          type="text"
          name="q"
          defaultValue={q}
          placeholder="단어 검색"
          className="border rounded px-3 py-1 text-sm"
        />
        <button className="border rounded px-3 py-1 text-sm">검색</button>
        <span className="text-sm text-zinc-500">전체 {total}개</span>
      </form>

      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left">
            <th className="py-2 pr-4">단어</th>
            <th className="py-2 pr-4">사용자</th>
            <th className="py-2 pr-4">출처</th>
            <th className="py-2 pr-4">감정</th>
            <th className="py-2 pr-4">기록일</th>
          </tr>
        </thead>
        <tbody>
          {(rows ?? []).map((r: any) => (
            <tr key={r.id} className="border-b">
              <td className="py-1 pr-4">{r.word_text}</td>
              <td className="py-1 pr-4">{r.profiles?.email ?? r.user_id}</td>
              <td className="py-1 pr-4">{r.source}</td>
              <td className="py-1 pr-4">
                {(r.emotion_tags ?? []).join(', ')}
              </td>
              <td className="py-1 pr-4">
                {new Date(r.created_at).toLocaleDateString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="flex gap-2 text-sm">
        {page > 1 && (
          <a
            className="underline"
            href={`?q=${encodeURIComponent(q)}&page=${page - 1}`}
          >
            이전
          </a>
        )}
        <span className="text-zinc-500">
          {page} / {totalPages}
        </span>
        {page < totalPages && (
          <a
            className="underline"
            href={`?q=${encodeURIComponent(q)}&page=${page + 1}`}
          >
            다음
          </a>
        )}
      </div>
    </div>
  );
}
