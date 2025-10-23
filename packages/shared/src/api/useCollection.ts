import { ref, onMounted, onUnmounted, type Ref } from 'vue';
import {
  collection as createCollection,
  getDocs,
  onSnapshot,
  query,
  type DocumentData,
  type QueryConstraint,
  type QueryDocumentSnapshot,
  type Unsubscribe,
} from 'firebase/firestore';
import { db } from '../firebase';

export interface UseCollectionOptions<T> {
  constraints?: QueryConstraint[];
  listen?: boolean;
  transform?: (doc: QueryDocumentSnapshot<DocumentData>) => T;
}

export interface UseCollectionResult<T> {
  data: Ref<T[]>;
  isLoading: Ref<boolean>;
  error: Ref<Error | null>;
  refresh: () => Promise<void>;
}

function defaultTransform<T>(doc: QueryDocumentSnapshot<DocumentData>): T {
  return { id: doc.id, ...(doc.data() as Record<string, unknown>) } as T;
}

function createQuery(collectionPath: string, constraints: QueryConstraint[] = []) {
  const collectionRef = createCollection(db, collectionPath);
  return constraints.length > 0 ? query(collectionRef, ...constraints) : collectionRef;
}

export function useCollection<T = Record<string, unknown>>(
  collectionPath: string,
  options: UseCollectionOptions<T> = {},
): UseCollectionResult<T> {
  const documents = ref<T[]>([]) as Ref<T[]>;
  const isLoading = ref<boolean>(false);
  const error = ref<Error | null>(null);
  const listen = options.listen ?? true;
  const transform = options.transform ?? defaultTransform<T>;
  let unsubscribe: Unsubscribe | null = null;

  const stopListening = () => {
    if (unsubscribe) {
      unsubscribe();
      unsubscribe = null;
    }
  };

  const loadOnce = async () => {
    isLoading.value = true;
    error.value = null;
    try {
      const snapshot = await getDocs(createQuery(collectionPath, options.constraints));
      documents.value = snapshot.docs.map((doc) => transform(doc));
    } catch (err) {
      error.value = err instanceof Error ? err : new Error(String(err));
      documents.value = [];
    } finally {
      isLoading.value = false;
    }
  };

  const startListener = () => {
    isLoading.value = true;
    error.value = null;
    stopListening();

    unsubscribe = onSnapshot(
      createQuery(collectionPath, options.constraints),
      (snapshot) => {
        documents.value = snapshot.docs.map((doc) => transform(doc));
        isLoading.value = false;
      },
      (err) => {
        error.value = err instanceof Error ? err : new Error(String(err));
        isLoading.value = false;
      },
    );
  };

  onMounted(() => {
    if (listen) {
      startListener();
    } else {
      void loadOnce();
    }
  });

  onUnmounted(() => {
    stopListening();
  });

  const refresh = async () => {
    if (listen) {
      startListener();
    } else {
      await loadOnce();
    }
  };

  return {
    data: documents,
    isLoading,
    error,
    refresh,
  };
}
