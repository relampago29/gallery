// src/i18n/request.ts
import {getRequestConfig} from 'next-intl/server';

const SUPPORTED = ['pt', 'en'] as const;

export default getRequestConfig(async ({locale}) => {
  const safeLocale = typeof locale === 'string' ? locale : 'pt';
  const chosen = (SUPPORTED as readonly string[]).includes(safeLocale) ? safeLocale : 'pt';

  try {
    // Usa o alias @ -> src/
    const messages = (await import(`@/locales/${chosen}/common.json`)).default;
    console.log('[i18n] loaded messages for', chosen, 'keys:', Object.keys(messages));
    return {locale: chosen, messages};
  } catch (e) {
    console.error('[i18n] failed to load messages for', chosen, e);
    // Fallback duro para pt
    const fallback = (await import('@/locales/pt/common.json')).default;
    return {locale: 'pt', messages: fallback};
  }
});
