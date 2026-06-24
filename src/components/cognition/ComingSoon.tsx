'use client';

// 인지근육 리포트가 아직 미완성일 때 일반 사용자에게 보여주는 '준비중' 화면.
// 게이트(featureFlags.useCognitionGate)가 막을 때만 렌더된다.

import Link from 'next/link';
import { useI18n } from '@/lib/i18n';

export default function ComingSoon() {
  const { t } = useI18n();
  return (
    <section className="mx-auto max-w-md py-10 text-center">
      <div className="text-5xl" aria-hidden>
        🚧
      </div>
      <h1 className="mt-4 text-xl font-semibold text-ink">{t('cog.soon.title')}</h1>
      <p className="mt-2 text-sm leading-relaxed text-slate-500">{t('cog.soon.desc')}</p>
      <div className="mt-6 flex justify-center gap-2">
        <Link
          href="/record"
          className="rounded-full bg-accent px-4 py-2 text-sm font-medium text-white transition-transform active:scale-95"
        >
          {t('cog.soon.cta.record')}
        </Link>
        <Link
          href="/train"
          className="rounded-full bg-white px-4 py-2 text-sm font-medium text-slate-600 transition-transform active:scale-95"
        >
          {t('cog.soon.cta.train')}
        </Link>
      </div>
    </section>
  );
}
