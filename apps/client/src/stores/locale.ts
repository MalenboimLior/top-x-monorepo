import { defineStore } from 'pinia';

type Direction = 'ltr' | 'rtl';

type LocaleMessages = Record<string, string>;

type GameTypeContent = {
  displayName: string;
  instructions: string;
  images: string[];
};

const LOCAL_STORAGE_KEY = 'topx.locale.preferredLanguage';

function normalizeLanguage(language: string | null | undefined): 'en' | 'il' {
  const value = (language || '').toLowerCase();

  if (value === 'il' || value.startsWith('he') || value.startsWith('iw')) {
    return 'il';
  }

  return 'en';
}

function persistLanguage(language: string) {
  try {
    if (typeof window !== 'undefined') {
      const previousCached = window.localStorage.getItem(LOCAL_STORAGE_KEY);
      window.localStorage.setItem(LOCAL_STORAGE_KEY, language);
      if (import.meta.env.DEV) {
        if (previousCached !== language) {
          console.info('[locale] 💾 SAVED language to cache:', language, previousCached ? `(was: ${previousCached})` : '(new)');
        } else {
          console.info('[locale] 💾 Language already in cache:', language);
        }
      }
    }
  } catch (error) {
    if (import.meta.env.DEV) {
      console.warn('[locale] ❌ Unable to persist language preference', error);
    }
  }
}

function loadPersistedLanguage(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const cachedLanguage = window.localStorage.getItem(LOCAL_STORAGE_KEY);
    if (import.meta.env.DEV) {
      if (cachedLanguage) {
        console.info('[locale] 📦 LOADED language from localStorage cache:', cachedLanguage);
      } else {
        console.info('[locale] 📦 No cached language found in localStorage');
      }
    }
    return cachedLanguage;
  } catch (error) {
    if (import.meta.env.DEV) {
      console.warn('[locale] ❌ Unable to load persisted language preference', error);
    }
    return null;
  }
}

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

const GAME_TYPE_CONTENT: Record<'en' | 'il', Record<string, GameTypeContent>> = {
  en: {
    pyramid: {
      displayName: 'Pyramid Rankings',
      instructions: 'Stack your picks from top-tier icons to the bottom rung. Every placement shifts the vibe—choose wisely before you lock it in.',
      images: ['/assets/fallback.png'],
    },
    pyramidtier: {
      displayName: 'Tier Pyramid',
      instructions: 'Drag and drop your roster into tiers from S to C. Shuffle until the crowd agrees and publish your final board.',
      images: ['/assets/fallback.png'],
    },
    trivia: {
      displayName: 'Trivia Clash',
      instructions: 'Answer fast, answer bold. Each correct hit boosts your streak; miss one and the leaderboard gets spicy.',
      images: ['/assets/fallback.png'],
    },
    zonereveal: {
      displayName: 'Zone Reveal',
      instructions: 'Uncover the map before time runs out. Tap, reveal, and guess the mystery zone with the fewest clues possible.',
      images: ['/assets/zonereveal/level1.jpg', '/assets/zonereveal/heart_icon.png'],
    },
    pacman: {
      displayName: 'Pac-X Chase',
      instructions: 'Collect the dots, dodge the ghosts, and snag the power-ups. Classic arcade energy with slick TOP-X styling.',
      images: ['/assets/fallback.png'],
    },
    fishergame: {
      displayName: 'Fishing Frenzy',
      instructions: 'Cast your line, hook the rares, and rack up a record haul before the timer dries up.',
      images: ['/assets/fallback.png'],
    },
  },
  il: {
    pyramid: {
      displayName: 'דירוג פירמידה',
      instructions: 'סדרו את הבחירות מראש הפסגה עד הבסיס. כל מיקום משנה את האווירה – בחרו חכם לפני שסוגרים.',
      images: ['/assets/fallback.png'],
    },
    pyramidtier: {
      displayName: 'פירמידת טיארים',
      instructions: 'גררו ושחררו את הרשימה שלכם לטיארים מ־S עד C. תעדכנו עד שהחברים מרוצים ואז מפרסמים.',
      images: ['/assets/fallback.png'],
    },
    trivia: {
      displayName: 'טריוויה על אש גבוהה',
      instructions: 'עונים מהר ובבטחון. כל פגיעה מדויקת מעלה את הרצף שלכם; טעות אחת ומישהו אחר קופץ לראשות הטבלה.',
      images: ['/assets/fallback.png'],
    },
    zonereveal: {
      displayName: 'חשיפת אזורים',
      instructions: 'מגלים את המפה לפני שהזמן אוזל. מקישים, חושפים ומנחשים את האזור הסודי עם כמה שפחות רמזים.',
      images: ['/assets/zonereveal/level1.jpg', '/assets/zonereveal/heart_icon.png'],
    },
    pacman: {
      displayName: 'Pac-X רודפים',
      instructions: 'אוספים את הנקודות, מתחמקים מהרוחות ולוכדים בוסטרים. נוסטלגיה ארקייד עם סטייל של TOP-X.',
      images: ['/assets/fallback.png'],
    },
    fishergame: {
      displayName: 'טירוף דייג',
      instructions: 'מטילים חכה, תופסים נדירים ומעמיסים ניקוד לפני שהשעון עוצר.',
      images: ['/assets/fallback.png'],
    },
  },
};

const fallbackGameTypeContent = GAME_TYPE_CONTENT[FALLBACK_LANGUAGE];

interface LocaleState {
  language: string;
  direction: Direction;
  messages: LocaleMessages;
  initialized: boolean;
  gameTypeContent: Record<string, GameTypeContent>;
}

interface LocaleActions {
  initialize(): Promise<void>;
  setLanguage(language: string): Promise<void>;
  translate(key: string, params?: Record<string, unknown>): string;
  getGameTypeContent(gameTypeId: string): GameTypeContent | null;
}

async function detectPreferredLanguage(): Promise<string> {
  if (typeof window === 'undefined') {
    return 'en';
  }

  if (import.meta.env.DEV) {
    console.info('[locale] 🌍 Detecting language from device...');
  }

  try {
    if (import.meta.env.DEV) {
      console.info('[locale] 🌍 Fetching device location from ipapi.co...');
    }
    const response = await fetch('https://ipapi.co/json/');
    if (response.ok) {
      const data = await response.json() as { country_code?: string };
      if (data.country_code === 'IL') {
        if (import.meta.env.DEV) {
          console.info('[locale] 🌍 ✓ Detected IL country code from device location → Hebrew');
        }
        return 'il';
      }
      if (import.meta.env.DEV) {
        console.info('[locale] 🌍 Device location returned country:', data.country_code ?? 'unknown', '→ English');
      }
    }
  } catch (error) {
    if (import.meta.env.DEV) {
      console.warn('[locale] 🌍 Device location detection failed, falling back to browser language:', error);
    }
  }

  const browserLanguage = navigator.languages?.[0] || navigator.language || 'en';
  const normalizedBrowserLang = normalizeLanguage(browserLanguage);
  if (import.meta.env.DEV) {
    console.info('[locale] 🌍 Using browser language:', browserLanguage, '→ normalized:', normalizedBrowserLang);
  }
  return normalizedBrowserLang;
}

async function loadLocaleMessages(language: string): Promise<LocaleMessages> {
  const normalized = language.toLowerCase();
  const localeId = normalized === 'il' ? 'il' : 'en';
  const fileName = localeId === 'en' ? 'en.json' : 'il.json';

  if (staticLocaleMessages[localeId]) {
    if (import.meta.env.DEV) {
      console.info('[locale] 📄 Loading locale file:', fileName);
      console.info('[locale] 📄 ✓ Loaded from bundled assets:', fileName);
    }
    return staticLocaleMessages[localeId];
  }

  try {
    if (import.meta.env.DEV) {
      console.info('[locale] 📄 Fetching locale file from server:', fileName);
    }
    const response = await fetch(`/locales/${localeId}.json?_=${Date.now()}`);
    if (!response.ok) {
      throw new Error(`Unable to load locale file for ${localeId}`);
    }
    const data = await response.json() as LocaleMessages;
    staticLocaleMessages[localeId] = data;
    if (import.meta.env.DEV) {
      console.info('[locale] 📄 ✓ Loaded locale file from server:', fileName, 'with', Object.keys(data).length, 'entries');
    }
    return data;
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error('[locale] ❌ Failed to load locale messages for', fileName, ':', error);
    }
    return {};
  }
}

export const useLocaleStore = defineStore<'locale', LocaleState, {}, LocaleActions>('locale', {
  state: (): LocaleState => ({
    language: '',
    direction: 'ltr',
    messages: fallbackMessages,
    initialized: false,
    gameTypeContent: fallbackGameTypeContent,
  }),
  actions: {
    async initialize() {
      if (import.meta.env.DEV) {
        console.info('[locale] ===== INITIALIZE START =====');
        console.info('[locale] Already initialized?', this.initialized);
        console.info('[locale] Current state - language:', this.language || '(empty)', 'direction:', this.direction);
      }
      
      // Always ensure direction matches language (Pinia persist might have restored language but not direction)
      // This is critical because direction is derived from language and not persisted
      if (this.language) {
        const expectedDirection: Direction = this.language === 'il' ? 'rtl' : 'ltr';
        if (this.direction !== expectedDirection) {
          if (import.meta.env.DEV) {
            console.warn('[locale] ⚠️ Direction mismatch detected! Language:', this.language, 'Direction:', this.direction, 'Expected:', expectedDirection);
            console.info('[locale] Fixing direction to match language...');
          }
          // Sync direction with language immediately
          this.direction = expectedDirection;
          if (typeof document !== 'undefined') {
            document.documentElement.setAttribute('dir', this.direction);
            document.documentElement.setAttribute('lang', this.language === 'il' ? 'he' : 'en');
            if (document.body) {
              document.body.setAttribute('dir', this.direction);
            }
          }
          if (import.meta.env.DEV) {
            console.info('[locale] ✓ Direction fixed to:', this.direction);
          }
        }
      }
      
      // If already initialized and direction is correct, skip full initialization
      if (this.initialized && this.language) {
        if (import.meta.env.DEV) {
          console.info('[locale] Already initialized, skipping full initialization');
        }
        return;
      }

      // First time initialization
      // Check localStorage cache first
      const cachedLanguage = loadPersistedLanguage();
      
      // Determine preferred language: cached > Pinia restored > device detection
      let preferredLanguage: string;
      
      if (cachedLanguage) {
        // Use cached language from localStorage
        preferredLanguage = normalizeLanguage(cachedLanguage);
        if (import.meta.env.DEV) {
          console.info('[locale] ✓ Using language from localStorage cache:', preferredLanguage);
        }
      } else if (this.language) {
        // Language was restored by Pinia persist plugin
        preferredLanguage = normalizeLanguage(this.language);
        if (import.meta.env.DEV) {
          console.info('[locale] ✓ Using language from Pinia persistence:', preferredLanguage);
        }
      } else {
        // No cached language, detect from device
        preferredLanguage = await detectPreferredLanguage();
        if (import.meta.env.DEV) {
          console.info('[locale] ✓ Detected language from device/browser:', preferredLanguage);
        }
      }

      if (import.meta.env.DEV) {
        console.info('[locale] Final preferred language:', preferredLanguage);
      }
      
      await this.setLanguage(preferredLanguage);
      this.initialized = true;
      if (import.meta.env.DEV) {
        console.info('[locale] ===== INITIALIZE COMPLETE =====');
      }
    },
    async setLanguage(language: string) {
      const normalizedLang = normalizeLanguage(language);
      const previousLanguage = this.language;
      const previousDirection = this.direction;
      
      // Determine direction based on language
      const newDirection: Direction = normalizedLang === 'il' ? 'rtl' : 'ltr';
      
      if (import.meta.env.DEV) {
        console.info('[locale] ===== SET LANGUAGE START =====');
        console.info('[locale] Previous language:', previousLanguage || '(none)', 'direction:', previousDirection);
        console.info('[locale] New language:', normalizedLang, 'direction:', newDirection);
      }
      
      this.language = normalizedLang;
      
      // Apply direction change if it changed
      if (this.direction !== newDirection) {
        this.direction = newDirection;
        if (import.meta.env.DEV) {
          console.info('[locale] 🔄 DIRECTION CHANGED:', previousDirection, '→', newDirection);
          console.info('[locale] Direction:', newDirection === 'rtl' ? 'RTL (Right-to-Left)' : 'LTR (Left-to-Right)');
        }
      } else {
        this.direction = newDirection;
        if (import.meta.env.DEV) {
          console.info('[locale] Direction unchanged:', newDirection);
        }
      }
      
      // Update DOM attributes
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
        if (import.meta.env.DEV) {
          console.info('[locale] Updated DOM: dir="' + this.direction + '", lang="' + (this.language === 'il' ? 'he' : 'en') + '"');
        }
      }
      
      // Load locale messages
      this.messages = await loadLocaleMessages(this.language);
      this.gameTypeContent = GAME_TYPE_CONTENT[this.language as 'en' | 'il'] ?? fallbackGameTypeContent;
      
      // Save to cache
      persistLanguage(this.language);
      
      if (import.meta.env.DEV) {
        console.info('[locale] Locale messages loaded for:', this.language);
        console.info('[locale] ===== SET LANGUAGE COMPLETE =====');
      }
    },
    translate(key: string, params?: Record<string, unknown>): string {
      let value = this.messages[key];
      if (value === undefined) {
        value = fallbackMessages[key];
        if (value === undefined) {
          if (import.meta.env.DEV) {
            console.warn('[locale] Missing translation for key', key, 'in language', this.language);
          }
          return key;
        }
        if (import.meta.env.DEV && this.language !== FALLBACK_LANGUAGE) {
          console.warn('[locale] Missing translation for key', key, 'in language', this.language, '- using fallback');
        }
      }

      // Replace parameters in the translation string
      if (params && typeof value === 'string') {
        return value.replace(/\{(\w+)\}/g, (match, paramKey) => {
          const paramValue = params[paramKey];
          return paramValue !== undefined && paramValue !== null ? String(paramValue) : match;
        });
      }

      return value;
    },
    getGameTypeContent(gameTypeId: string): GameTypeContent | null {
      const normalizedId = gameTypeId.toLowerCase();
      const fromActive =
        this.gameTypeContent[gameTypeId] ?? this.gameTypeContent[normalizedId];
      if (fromActive) {
        return fromActive;
      }

      const fallbackValue =
        fallbackGameTypeContent[gameTypeId] ?? fallbackGameTypeContent[normalizedId];
      if (fallbackValue) {
        return fallbackValue;
      }

      if (import.meta.env.DEV) {
        console.warn('[locale] Missing GameType content for key', gameTypeId);
      }
      return null;
    },
  },
  persist: {
    pick: ['language'],
  },
});
