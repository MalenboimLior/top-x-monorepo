import type { Timestamp } from 'firebase/firestore';

export type SupportedLocale = 'en' | 'il';

export type PageContentId = 'contact' | 'build' | 'terms';

export interface SeoMetadata {
  title?: string;
  description?: string;
  keywords?: string;
}

export interface PageContentLocaleData {
  content?: Record<string, string>;
  seo?: SeoMetadata;
  updatedAt?: Timestamp | Date | string | null;
}

export interface PageContentDocument {
  schemaVersion?: number;
  locales?: Record<string, PageContentLocaleData>;
  updatedAt?: Timestamp | Date | string | null;
}

export interface PageContentDefaults {
  [pageId: string]: Partial<Record<SupportedLocale, { content: Record<string, string>; seo: SeoMetadata }>>;
}
