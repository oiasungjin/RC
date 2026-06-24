'use client';

// 법적 고지 문서 공용 뷰. 언어별 LegalDoc 하나를 받아 제목·시행일·섹션을 렌더한다.

import Link from 'next/link';
import { useI18n } from '@/lib/i18n';
import type { LegalDoc } from '@/lib/legal/types';

export default function LegalDocView({ doc }: { doc: LegalDoc }) {
  const { t } = useI18n();
  return (
    <article className="mx-auto max-w-2xl px-4 py-8">
      <Link href="/" className="text-sm text-slate-400 transition-colors hover:text-ink">
        {t('common.backDashboard')}
      </Link>
      <h1 className="mt-4 text-2xl font-semibold text-ink">{doc.title}</h1>
      <p className="mt-1 text-xs text-slate-400">{doc.updated}</p>
      {doc.intro && <p className="mt-4 text-sm leading-relaxed text-slate-600">{doc.intro}</p>}
      <div className="mt-6 space-y-6">
        {doc.sections.map((s, i) => (
          <section key={i}>
            <h2 className="text-base font-semibold text-ink">{s.heading}</h2>
            <div className="mt-2 space-y-2 text-sm leading-relaxed text-slate-600">
              {s.body.map((line, j) =>
                line.startsWith('· ') ? (
                  <p key={j} className="-indent-3 pl-4">
                    {line}
                  </p>
                ) : (
                  <p key={j}>{line}</p>
                )
              )}
            </div>
          </section>
        ))}
      </div>
    </article>
  );
}
