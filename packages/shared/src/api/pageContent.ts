import { ref, watch, type Ref, isRef, unref } from 'vue';
import {
  doc,
  getDoc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  type DocumentReference,
  type Unsubscribe,
} from 'firebase/firestore';
import { db } from '../firebase';
import type {
  PageContentDocument,
  PageContentId,
  PageContentLocaleData,
  SeoMetadata,
  SupportedLocale,
} from '../types/content';

export interface UsePageContentDocResult {
  content: Ref<Record<string, string>>;
  seo: Ref<SeoMetadata>;
  isLoading: Ref<boolean>;
  error: Ref<Error | null>;
  refresh: () => Promise<void>;
}

interface UsePageContentDocOptions {
  listen?: boolean;
}

export function usePageContentDoc(
  pageId: PageContentId | Ref<PageContentId>,
  locale: Ref<string>,
  options: UsePageContentDocOptions = {},
): UsePageContentDocResult {
  const isLoading = ref(false);
  const error = ref<Error | null>(null);
  const content = ref<Record<string, string>>({});
  const seo = ref<SeoMetadata>({});
  const listen = options.listen ?? true;
  let unsubscribe: Unsubscribe | null = null;
  const pageRef = isRef(pageId) ? pageId : ref(pageId);

  const stopListening = () => {
    if (unsubscribe) {
      unsubscribe();
      unsubscribe = null;
    }
  };

  const resolveLocaleData = (docData: PageContentDocument | undefined, localeCode: string) => {
    const localeData = docData?.locales?.[localeCode] as PageContentLocaleData | undefined;
    content.value = { ...(localeData?.content ?? {}) };
    seo.value = { ...(localeData?.seo ?? {}) };
  };

  const loadOnce = async (page: PageContentId, localeCode: string) => {
    if (!localeCode) return;
    isLoading.value = true;
    error.value = null;

    try {
      const snapshot = await getDoc(getPageContentRef(page));
      resolveLocaleData(snapshot.data() as PageContentDocument | undefined, localeCode);
    } catch (err) {
      error.value = err instanceof Error ? err : new Error(String(err));
      content.value = {};
      seo.value = {};
    } finally {
      isLoading.value = false;
    }
  };

  watch(
    [pageRef, locale],
    ([pageIdValue, localeCode]) => {
      stopListening();
      const normalized = normalizeLocale(localeCode);
      if (!normalized) {
        content.value = {};
        seo.value = {};
        return;
      }

      if (listen) {
        isLoading.value = true;
        error.value = null;
        unsubscribe = onSnapshot(
          getPageContentRef(pageIdValue),
          (snapshot) => {
            resolveLocaleData(snapshot.data() as PageContentDocument | undefined, normalized);
            isLoading.value = false;
          },
          (err) => {
            error.value = err instanceof Error ? err : new Error(String(err));
            isLoading.value = false;
          },
        );
      } else {
        void loadOnce(pageIdValue, normalized);
      }
    },
    { immediate: true },
  );

  const refresh = async () => {
    const pageIdValue = unref(pageRef);
    const localeCode = normalizeLocale(locale.value);
    if (!localeCode) return;

    if (listen) {
      stopListening();
      isLoading.value = true;
      error.value = null;
      unsubscribe = onSnapshot(
        getPageContentRef(pageIdValue),
        (snapshot) => {
          resolveLocaleData(snapshot.data() as PageContentDocument | undefined, localeCode);
          isLoading.value = false;
        },
        (err) => {
          error.value = err instanceof Error ? err : new Error(String(err));
          isLoading.value = false;
        },
      );
    } else {
      await loadOnce(pageIdValue, localeCode);
    }
  };

  return {
    content,
    seo,
    isLoading,
    error,
    refresh,
  };
}

export async function savePageContentLocale(
  pageId: PageContentId,
  locale: SupportedLocale,
  payload: { content: Record<string, string>; seo: SeoMetadata },
): Promise<void> {
  const docRef = getPageContentRef(pageId);
  await setDoc(
    docRef,
    {
      schemaVersion: 1,
      locales: {
        [locale]: {
          content: payload.content,
          seo: payload.seo,
          updatedAt: serverTimestamp(),
        },
      },
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
}

function getPageContentRef(pageId: PageContentId): DocumentReference<PageContentDocument> {
  return doc(db, 'page_content', pageId) as DocumentReference<PageContentDocument>;
}

function normalizeLocale(locale: string | undefined | null): SupportedLocale | null {
  if (!locale) return 'en';
  const lower = locale.toLowerCase();
  if (lower.startsWith('il') || lower.startsWith('he')) {
    return 'il';
  }
  return 'en';
}
