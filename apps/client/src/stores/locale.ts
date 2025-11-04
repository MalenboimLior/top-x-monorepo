import { defineStore } from 'pinia';

type Direction = 'ltr' | 'rtl';

type LocaleMessages = Record<string, string>;

const localeModules = import.meta.glob<{ default: LocaleMessages }>(
  '../locales/*.json',
  { eager: true },
);

const staticLocaleMessages = Object.entries(localeModules).reduce(
  (acc, [path, module]) => {
    const match = path.match(/([^/]+)\.json$/);
    if (match && module?.default) {
      acc[match[1]] = module.default;
    }
    return acc;
  },
  {} as Record<string, LocaleMessages>,
);

const FALLBACK_LANGUAGE = 'en';
const fallbackMessages = staticLocaleMessages[FALLBACK_LANGUAGE] ?? {};

interface LocaleState {
  language: string;
  direction: Direction;
    messages: LocaleMessages;
  initialized: boolean;
}

interface LocaleActions {
  initialize(): Promise<void>;
  setLanguage(language: string): Promise<void>;
  translate(key: string): string;
}

async function detectPreferredLanguage(): Promise<string> {
  if (typeof window === 'undefined') {
    return 'en';
  }

  try {
    const response = await fetch('https://ipapi.co/json/');
    if (response.ok) {
      const data = await response.json() as { country_code?: string };
      if (data.country_code === 'IL') {
        return 'il';
      }
    }
  } catch (error) {
    console.warn('Locale detection fallback due to error:', error);
  }

  const browserLanguage = navigator.languages?.[0] || navigator.language || 'en';
  if (browserLanguage.toLowerCase().startsWith('he') || browserLanguage.toLowerCase().startsWith('iw')) {
    return 'il';
  }

  return 'en';
}

function normalizeLanguage(language: string | undefined | null): 'en' | 'il' {
  const normalized = (language || '').toLowerCase();
  if (normalized === 'il' || normalized.startsWith('he') || normalized.startsWith('iw')) {
    return 'il';
  }
  return 'en';
}

async function loadLocaleMessages(language: string): Promise<LocaleMessages> {
  const localeId = normalizeLanguage(language);

  if (staticLocaleMessages[localeId]) {
    if (import.meta.env.DEV) {
      console.info('[locale] Using cached locale messages for', localeId);
    }
    return staticLocaleMessages[localeId];
  }

  try {
    if (import.meta.env.DEV) {
      console.info('[locale] Fetching locale messages for', localeId);
    }
    const response = await fetch(`/locales/${localeId}.json?_=${Date.now()}`);
    if (!response.ok) {
      throw new Error(`Unable to load locale file for ${localeId}`);
    }
    const data = await response.json() as LocaleMessages;
    staticLocaleMessages[localeId] = data;
    if (import.meta.env.DEV) {
      console.info('[locale] Loaded locale messages for', localeId, 'with', Object.keys(data).length, 'entries');
    }
    return data;
  } catch (error) {
    console.error('Failed to load locale messages:', error);
    return {};
  }
}

export const useLocaleStore = defineStore<'locale', LocaleState, {}, LocaleActions>('locale', {
  state: (): LocaleState => ({
    language: '',
    direction: 'ltr',
    messages: fallbackMessages,
    initialized: false,
  }),
  actions: {
    async initialize() {
      if (import.meta.env.DEV) {
        console.info('[locale] initialize called. Already initialized?', this.initialized);
      }
      if (this.initialized) {
        return;
      }

      const preferredLanguage = this.language || await detectPreferredLanguage();
      if (import.meta.env.DEV) {
        console.info('[locale] Preferred language detected as', preferredLanguage);
      }
      await this.setLanguage(preferredLanguage);
      this.initialized = true;
      if (import.meta.env.DEV) {
        console.info('[locale] Initialization complete');
      }
    },
    async setLanguage(language: string) {
      this.language = normalizeLanguage(language);
      this.direction = this.language === 'il' ? 'rtl' : 'ltr';
      if (import.meta.env.DEV) {
        console.info('[locale] Setting language to', this.language, 'direction', this.direction);
      }
      if (typeof document !== 'undefined') {
        document.documentElement.setAttribute('dir', this.direction);
        document.documentElement.setAttribute('lang', this.language === 'il' ? 'he' : 'en');
        if (document.body) {
          document.body.setAttribute('dir', this.direction);
        } else {
          if (typeof window !== 'undefined') {
            window.addEventListener('DOMContentLoaded', () => {
              document.body?.setAttribute('dir', this.direction);
            }, { once: true });
          }
        }
      }
      this.messages = await loadLocaleMessages(this.language);
      if (import.meta.env.DEV) {
        console.info('[locale] Locale messages ready for', this.language);
      }
    },
    translate(key: string): string {
      const value = this.messages[key];
      if (value !== undefined) {
        return value;
      }

      const fallbackValue = fallbackMessages[key];

      if (fallbackValue !== undefined) {
        if (import.meta.env.DEV && this.language !== FALLBACK_LANGUAGE) {
          console.warn('[locale] Missing translation for key', key, 'in language', this.language, '- using fallback');
        }
        return fallbackValue;
      }

      if (import.meta.env.DEV) {
        console.warn('[locale] Missing translation for key', key, 'in language', this.language);
      }
      return key;
    },
  },
  persist: {
    paths: ['language'],
  },
});
