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

interface LocaleState {
  language: string;
  direction: Direction;
  messages: LocaleMessages;
  initialized: boolean;
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

async function loadLocaleMessages(language: string): Promise<LocaleMessages> {
  const normalized = language.toLowerCase();
  const localeId = normalized === 'il' ? 'il' : 'en';

  if (staticLocaleMessages[localeId]) {
    return staticLocaleMessages[localeId];
  }

  try {
    const response = await fetch(`/locales/${localeId}.json?_=${Date.now()}`);
    if (!response.ok) {
      throw new Error(`Unable to load locale file for ${localeId}`);
    }
    const data = await response.json() as LocaleMessages;
    staticLocaleMessages[localeId] = data;
    return data;
  } catch (error) {
    console.error('Failed to load locale messages:', error);
    return {};
  }
}

export const useLocaleStore = defineStore('locale', {
  state: (): LocaleState => ({
    language: '',
    direction: 'ltr',
    messages: {},
    initialized: false,
  }),
  actions: {
    async initialize() {
      if (this.initialized) {
        return;
      }

      const preferredLanguage = this.language || await detectPreferredLanguage();
      await this.setLanguage(preferredLanguage);
      this.initialized = true;
    },
    async setLanguage(language: string) {
      const normalized = (language || 'en').toLowerCase();
      this.language = normalized === 'il' ? 'il' : 'en';
      this.direction = this.language === 'il' ? 'rtl' : 'ltr';
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
    },
    translate(key: string): string {
      return this.messages[key] ?? key;
    },
  },
  persist: {
    paths: ['language'],
  },
});
