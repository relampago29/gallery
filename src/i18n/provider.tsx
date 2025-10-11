// src/i18n/provider.tsx
'use client';

import {NextIntlClientProvider} from 'next-intl';

type Props = {
  children: React.ReactNode;
  locale: string;
  messages: Record<string, string>;
};

export default function I18nProvider({children, locale, messages}: Props) {
  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      {children}
    </NextIntlClientProvider>
  );
}
