'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { Languages } from 'lucide-react';
import { intlLocale, isLocale, translate, type Locale } from '@/lib/i18n';

interface LocaleContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (message: string, values?: Record<string, string | number>) => string;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('en');

  useEffect(() => {
    const savedLocale = window.localStorage.getItem('ironpulse-locale');
    if (isLocale(savedLocale)) setLocaleState(savedLocale);
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale === 'ne' ? 'ne' : locale;
  }, [locale]);

  function setLocale(nextLocale: Locale) {
    window.localStorage.setItem('ironpulse-locale', nextLocale);
    setLocaleState(nextLocale);
  }

  const value = {
    locale,
    setLocale,
    t: (message: string, values?: Record<string, string | number>) =>
      translate(locale, message, values),
  };

  return (
    <LocaleContext.Provider value={value}>
      {children}
      <LocaleSwitcher />
    </LocaleContext.Provider>
  );
}

function LocaleSwitcher() {
  const context = useContext(LocaleContext);
  if (!context) return null;

  return (
    <label className="fixed bottom-4 right-4 z-60 inline-flex h-10 items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-900 px-3 text-xs font-medium text-zinc-100 shadow-lg shadow-black/30">
      <Languages aria-hidden="true" className="h-4 w-4 text-rose-400" />
      <span className="sr-only">{context.t('Language')}</span>
      <select
        aria-label={context.t('Language')}
        value={context.locale}
        onChange={(event) => context.setLocale(event.target.value as Locale)}
        className="cursor-pointer appearance-none bg-transparent pr-1 outline-none"
      >
        <option className="bg-zinc-900" value="en">English</option>
        <option className="bg-zinc-900" value="hi">हिन्दी</option>
        <option className="bg-zinc-900" value="ne">नेपाली</option>
      </select>
    </label>
  );
}

export function useTranslation() {
  const context = useContext(LocaleContext);
  if (!context) throw new Error('useTranslation must be used within LocaleProvider');
  return context.t;
}

export function useLocale() {
  const context = useContext(LocaleContext);
  if (!context) throw new Error('useLocale must be used within LocaleProvider');
  return context.locale;
}

export function LocaleDate({
  value,
  format = 'datetime',
}: {
  value: string;
  format?: 'date' | 'time' | 'datetime';
}) {
  const locale = useLocale();
  const options: Intl.DateTimeFormatOptions = format === 'date'
    ? { dateStyle: 'medium' }
    : format === 'time'
      ? { hour: '2-digit', minute: '2-digit' }
      : { dateStyle: 'medium', timeStyle: 'short' };
  return <>{new Intl.DateTimeFormat(intlLocale(locale), options).format(new Date(value))}</>;
}

export function LocaleNumber({
  value,
  currency,
}: {
  value: number;
  currency?: string;
}) {
  const locale = useLocale();
  const options: Intl.NumberFormatOptions = currency
    ? { style: 'currency', currency, maximumFractionDigits: 0 }
    : {};
  return <>{new Intl.NumberFormat(intlLocale(locale), options).format(value)}</>;
}

export function T({
  message,
  values,
}: {
  message: string;
  values?: Record<string, string | number>;
}) {
  const t = useTranslation();
  return <>{t(message, values)}</>;
}