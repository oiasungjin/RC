'use client';

import { useI18n } from '@/lib/i18n';
import LegalDocView from '@/components/LegalDocView';
import { TERMS } from '@/lib/legal';

export default function TermsPage() {
  const { language } = useI18n();
  return <LegalDocView doc={TERMS[language]} />;
}
