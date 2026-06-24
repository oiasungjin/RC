'use client';

import { useI18n } from '@/lib/i18n';
import LegalDocView from '@/components/LegalDocView';
import { DISCLAIMER } from '@/lib/legal';

export default function DisclaimerPage() {
  const { language } = useI18n();
  return <LegalDocView doc={DISCLAIMER[language]} />;
}
