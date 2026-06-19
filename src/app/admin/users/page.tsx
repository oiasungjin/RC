import Link from 'next/link';
import { createAdminClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export default async function UsersPage() {
  const admin = createAdminClient();
  const { data: profiles } = await admin
    .from('profiles')
    .select('id, email, role, created_at, last_seen_at')
    .order('created_at', { ascending: false });

  // 사용자별 단어 카운트
  const { data: vocabs } = await admin
    .from('vocabulary_items')
    .select('user_id');
  const vocabByUser: Record<string, number> = {};
  for (const v of vocabs ?? []) {
    vocabByUser[v.user_id] = (vocabByUser[v.user_id] ?? 0) + 1;
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">사용자</h1>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left">
              <th className="py-2 pr-4">이메일</th>
              <th className="py-2 pr-4">역할</th>
              <th className="py-2 pr-4">가입일</th>
              <th className="py-2 pr-4">최근 접속</th>
              <th className="py-2 pr-4">단어 수</th>
              <th className="py-2 pr-4"></th>
            </tr>
          </thead>
          <tbody>
            {(profiles ?? []).map((p) => (
              <tr key={p.id} className="border-b">
                <td className="py-2 pr-4">{p.email}</td>
                <td className="py-2 pr-4">{p.role}</td>
                <td className="py-2 pr-4">
                  {new Date(p.created_at).toLocaleDateString()}
                </td>
                <td className="py-2 pr-4">
                  {p.last_seen_at
                    ? new Date(p.last_seen_at).toLocaleString()
                    : '-'}
                </td>
                <td className="py-2 pr-4 font-mono">
                  {vocabByUser[p.id] ?? 0}
                </td>
                <td className="py-2 pr-4">
                  <Link
                    href={`/admin/users/${p.id}`}
                    className="underline text-blue-600"
                  >
                    상세
                  </Link>
                </td>
              </tr>
            ))}
            {(profiles ?? []).length === 0 && (
              <tr>
                <td className="py-4 text-zinc-500" colSpan={6}>
                  사용자 없음
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
