import { redirect } from 'next/navigation';
import Link from 'next/link';
import { isAdmin } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const ok = await isAdmin();
  if (!ok) redirect('/login?next=/admin');

  return (
    <div className="min-h-screen">
      <nav className="bg-zinc-900 text-zinc-100 px-4 py-2 text-sm">
        <div className="mx-auto max-w-6xl flex items-center gap-4">
          <span className="font-bold">관리자</span>
          <Link href="/admin" className="hover:underline">
            대시보드
          </Link>
          <Link href="/admin/users" className="hover:underline">
            사용자
          </Link>
          <Link href="/admin/vocab" className="hover:underline">
            전체 단어
          </Link>
          <Link href="/admin/recall" className="hover:underline">
            회상 단서
          </Link>
          <span className="ml-auto">
            <Link href="/" className="hover:underline">
              앱으로
            </Link>
          </span>
        </div>
      </nav>
      <main className="mx-auto max-w-6xl p-6">{children}</main>
    </div>
  );
}
