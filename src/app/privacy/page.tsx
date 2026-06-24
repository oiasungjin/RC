'use client';

import { useI18n } from '@/lib/i18n';
import LegalDocView from '@/components/LegalDocView';
import { PRIVACY } from '@/lib/legal';

export default function PrivacyPage() {
  const { language } = useI18n();
  return <LegalDocView doc={PRIVACY[language]} />;
}
