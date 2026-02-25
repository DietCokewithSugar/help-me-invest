export { zh } from './locales/zh';
export type { TranslationKeys } from './locales/zh';
export { en } from './locales/en';

export type Locale = 'zh' | 'en';

export const locales: Record<Locale, string> = {
  zh: '中文',
  en: 'English',
};
