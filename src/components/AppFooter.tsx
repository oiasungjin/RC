'use client';

import Link from 'next/link';
import { useI18n } from '@/lib/i18n';

export default function AppFooter() {
  const { t } = useI18n();

  return (
    <footer className="mt-8 border-t border-divider bg-parchment">
      <div className="mx-auto max-w-lg px-4 py-8 text-xs leading-relaxed text-slate-500">
        <p>{t('footer.sync')}</p>
        <p className="mt-1">{t('footer.medical')}</p>
        <nav className="mt-3 flex flex-wrap gap-x-3 gap-y-1">
          <Link href="/terms" className="hover:text-ink hover:underline">
            {t('footer.terms')}
          </Link>
          <Link href="/privacy" className="hover:text-ink hover:underline">
            {t('footer.privacy')}
          </Link>
          <Link href="/disclaimer" className="hover:text-ink hover:underline">
            {t('footer.disclaimer')}
          </Link>
        </nav>
      </div>
    </footer>
  );
}
