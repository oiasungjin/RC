'use client';

import { useI18n, type Language } from '@/lib/i18n';

const languages: { value: Language; label: string }[] = [
  { value: 'ko', label: 'KO' },
  { value: 'en', label: 'EN' },
  { value: 'ja', label: '日本' },
];

export default function LanguageSwitcher() {
  const { language, setLanguage } = useI18n();

  return (
    <select
      aria-label="Language"
      value={language}
      onChange={(event) => setLanguage(event.target.value as Language)}
      className="h-8 w-[4.5rem] shrink-0 rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-600 outline-none transition-colors focus:border-accent focus:ring-2 focus:ring-blue-100"
    >
      {languages.map((item) => (
        <option key={item.value} value={item.value}>
          {item.label}
        </option>
      ))}
    </select>
  );
}
