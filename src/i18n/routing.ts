// src/i18n/routing.ts
import {defineRouting} from 'next-intl/routing';

export const routing = defineRouting({
  locales: ['pt', 'en'] as const,
  defaultLocale: 'pt',
  localePrefix: 'always' // ou 'as-needed'
});

export type Locale = typeof routing.locales[number];
