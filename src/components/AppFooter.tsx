'use client';

import { useI18n } from '@/lib/i18n';

export default function AppFooter() {
  const { t } = useI18n();

  return (
    <footer className="mt-8 border-t border-divider bg-parchment">
      <div className="mx-auto max-w-lg px-4 py-8 text-xs leading-relaxed text-slate-500">
        <p>{t('footer.sync')}</p>
        <p className="mt-1">{t('footer.medical')}</p>
      </div>
    </footer>
  );
}
