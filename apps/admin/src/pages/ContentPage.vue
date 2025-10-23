<template>
  <section class="section content-manager">
    <div class="container">
      <header class="content-manager__header">
        <div>
          <h1 class="title">Content</h1>
          <p class="subtitle">Manage pyramid rows, trivia questions, and community submissions.</p>
        </div>
        <div class="content-manager__actions">
          <div class="buttons has-addons" role="group" aria-label="Toggle between table and card views">
            <button
              class="button"
              :class="{ 'is-link': activeView === 'table' }"
              type="button"
              @click="setView('table')"
              :aria-pressed="activeView === 'table'"
            >
              <span class="icon"><font-awesome-icon icon="table" aria-hidden="true" /></span>
              <span>Table</span>
            </button>
            <button
              class="button"
              :class="{ 'is-link': activeView === 'cards' }"
              type="button"
              @click="setView('cards')"
              :aria-pressed="activeView === 'cards'"
            >
              <span class="icon"><font-awesome-icon icon="th-large" aria-hidden="true" /></span>
              <span>Cards</span>
            </button>
          </div>
          <button class="button is-light" type="button" @click="refreshActive">
            <span class="icon"><font-awesome-icon icon="sync" aria-hidden="true" /></span>
            <span>Refresh</span>
          </button>
        </div>
      </header>

      <nav class="tabs is-toggle is-toggle-rounded is-fullwidth content-manager__tabs" aria-label="Content types">
        <ul>
          <li
            v-for="section in contentSections"
            :key="section.id"
            :class="{ 'is-active': activeTab === section.id }"
          >
            <a href="#" @click.prevent="setTab(section.id)">
              <span>{{ section.label }}</span>
              <span class="tag is-light" aria-hidden="true">{{ section.data.value.length }}</span>
            </a>
          </li>
        </ul>
      </nav>

      <p class="content-manager__description">{{ activeSection?.description }}</p>

      <div v-if="activeSection?.error.value" class="notification is-danger is-light">
        <p class="has-text-weight-semibold">We couldn’t load this collection.</p>
        <p>{{ activeSection.error.value.message }}</p>
      </div>

      <div v-else>
        <div v-if="activeSection?.isLoading.value" class="has-text-centered">
          <progress class="progress is-small is-link" max="100">Loading</progress>
        </div>

        <TableView
          v-else-if="activeSection"
          :key="activeSection.id"
          :data="activeSection.data.value"
          :columns="activeSection.columns"
          :view-mode="activeView"
          :card-layout="activeSection.cardLayout"
          :enable-search="activeSection.enableSearch ?? true"
          :enable-filters="activeSection.enableFilters ?? true"
          :enable-sorting="activeSection.enableSorting ?? true"
          :empty-state="emptyStates[activeSection.id]"
        />
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, h, ref } from 'vue';
import TableView from '@/components/content/TableView.vue';
import { useCollection, type UseCollectionResult } from '@top-x/shared/api/useCollection';
import type { PyramidItem } from '@top-x/shared/types/pyramid';
import type { TriviaQuestion } from '@top-x/shared/types/trivia';
import type { DailyChallenge } from '@top-x/shared/types/dailyChallenge';
import type { TableColumn, CardLayout } from '@/components/content/tableTypes';

interface CommunitySubmission {
  id: string;
  title?: string;
  submittedBy?: string;
  status?: string;
  createdAt?: string;
  type?: string;
}

interface SectionConfig {
  id: ContentTab;
  label: string;
  description: string;
  data: UseCollectionResult<ContentEntry>['data'];
  isLoading: UseCollectionResult<ContentEntry>['isLoading'];
  error: UseCollectionResult<ContentEntry>['error'];
  refresh: UseCollectionResult<ContentEntry>['refresh'];
  columns: TableColumn<ContentEntry>[];
  cardLayout: CardLayout;
  enableSearch?: boolean;
  enableFilters?: boolean;
  enableSorting?: boolean;
}

type ContentTab = 'pyramids' | 'trivia' | 'community' | 'daily';

type ContentEntry = Record<string, unknown> & { id: string };

const activeTab = ref<ContentTab>('pyramids');
const activeView = ref<'table' | 'cards'>('table');

const pyramidCollection = useCollection<ContentEntry>('pyramids', {
  transform: (doc) => {
    const data = doc.data() as PyramidItem;
    return {
      id: doc.id,
      name: data.name,
      label: data.label,
      source: data.source,
      active: data.active,
      color: data.color,
    } satisfies ContentEntry;
  },
});

const triviaCollection = useCollection<ContentEntry>('trivia_questions', {
  transform: (doc) => {
    const data = doc.data() as TriviaQuestion;
    return {
      id: doc.id,
      text: data.text,
      category: data.category,
      options: data.options,
      correctAnswer: data.correctAnswer,
    } satisfies ContentEntry;
  },
});

const communityCollection = useCollection<ContentEntry>('community_submissions', {
  transform: (doc) => {
    const data = doc.data() as CommunitySubmission;
    return {
      id: doc.id,
      title: data.title,
      submittedBy: data.submittedBy,
      status: data.status,
      createdAt: data.createdAt,
      type: data.type,
    } satisfies ContentEntry;
  },
  listen: false,
});

const dailyChallengesCollection = useCollection<ContentEntry>('daily_challenges', {
  transform: (doc) => {
    const data = doc.data() as DailyChallenge;
    const custom = data.custom as Record<string, unknown> | undefined;
    let mode: string | undefined;

    if (custom) {
      if ('rows' in custom && 'items' in custom) {
        mode = 'pyramid';
      } else if ('questions' in custom) {
        mode = 'trivia';
      } else if ('levelsConfig' in custom) {
        mode = 'zone reveal';
      }
    }

    return {
      id: doc.id,
      number: data.number,
      date: data.date,
      challengeAvailableUTC: data.challengeAvailableUTC,
      answerRevealUTC: data.answerRevealUTC,
      type: mode,
    } satisfies ContentEntry;
  },
  listen: false,
});

const statusFilters = [
  { label: 'Active', value: 'active' },
  { label: 'Inactive', value: 'inactive' },
];

const submissionStatusFilters = [
  { label: 'Pending', value: 'pending' },
  { label: 'Approved', value: 'approved' },
  { label: 'Rejected', value: 'rejected' },
];

const pyramidColumns: TableColumn<ContentEntry>[] = [
  {
    id: 'name',
    header: 'Name',
    accessor: (row) => textOrPlaceholder(getField<string>(row, 'name')),
    getValue: (row) => getField<string>(row, 'name') ?? '',
    searchable: true,
    sortAccessor: (row) => (getField<string>(row, 'name') ?? '').toLowerCase(),
  },
  {
    id: 'label',
    header: 'Label',
    accessor: (row) => textOrPlaceholder(getField<string>(row, 'label')),
    getValue: (row) => getField<string>(row, 'label') ?? '',
    searchable: true,
    sortAccessor: (row) => (getField<string>(row, 'label') ?? '').toLowerCase(),
  },
  {
    id: 'source',
    header: 'Source',
    accessor: (row) => textOrPlaceholder(getField<string>(row, 'source')),
    getValue: (row) => getField<string>(row, 'source') ?? '',
    searchable: true,
    sortAccessor: (row) => (getField<string>(row, 'source') ?? '').toLowerCase(),
  },
  {
    id: 'active',
    header: 'Status',
    accessor: (row) => (resolveStatus(row) === 'active' ? 'Active' : 'Inactive'),
    getValue: (row) => (resolveStatus(row) === 'active' ? 'Active' : 'Inactive'),
    filterOptions: statusFilters,
    filterFn: (row, value) => resolveStatus(row) === value,
    sortAccessor: (row) => (resolveStatus(row) === 'active' ? 1 : 0),
  },
  {
    id: 'color',
    header: 'Color',
    accessor: (row) => textOrPlaceholder(getField<string>(row, 'color')),
    getValue: (row) => getField<string>(row, 'color') ?? '',
    searchable: true,
  },
];

const triviaColumns: TableColumn<ContentEntry>[] = [
  {
    id: 'text',
    header: 'Question',
    accessor: (row) => textOrPlaceholder(getField<string>(row, 'text')),
    getValue: (row) => getField<string>(row, 'text') ?? '',
    searchable: true,
    sortAccessor: (row) => (getField<string>(row, 'text') ?? '').toLowerCase(),
  },
  {
    id: 'category',
    header: 'Category',
    accessor: (row) => textOrPlaceholder(getField<string>(row, 'category')),
    getValue: (row) => getField<string>(row, 'category') ?? '',
    searchable: true,
    sortAccessor: (row) => (getField<string>(row, 'category') ?? '').toLowerCase(),
  },
  {
    id: 'options',
    header: 'Choices',
    accessor: (row) => {
      const options = getField<string[]>(row, 'options');
      return options ? `${options.length} options` : '—';
    },
    getValue: (row) => {
      const options = getField<string[]>(row, 'options');
      return options ? `${options.length} options` : '—';
    },
    sortAccessor: (row) => getField<string[]>(row, 'options')?.length ?? 0,
  },
  {
    id: 'correctAnswer',
    header: 'Answer',
    accessor: (row) => textOrPlaceholder(getField<string>(row, 'correctAnswer')),
    getValue: (row) => getField<string>(row, 'correctAnswer') ?? '',
  },
];

const communityColumns: TableColumn<ContentEntry>[] = [
  {
    id: 'title',
    header: 'Title',
    accessor: (row) => textOrPlaceholder(getField<string>(row, 'title')),
    getValue: (row) => getField<string>(row, 'title') ?? '',
    searchable: true,
    sortAccessor: (row) => (getField<string>(row, 'title') ?? '').toLowerCase(),
  },
  {
    id: 'submittedBy',
    header: 'Submitted By',
    accessor: (row) => textOrPlaceholder(getField<string>(row, 'submittedBy')),
    getValue: (row) => getField<string>(row, 'submittedBy') ?? '',
    searchable: true,
    sortAccessor: (row) => (getField<string>(row, 'submittedBy') ?? '').toLowerCase(),
  },
  {
    id: 'status',
    header: 'Status',
    accessor: (row) => textOrPlaceholder(getField<string>(row, 'status')),
    getValue: (row) => getField<string>(row, 'status') ?? '',
    filterOptions: submissionStatusFilters,
    filterFn: (row, value) => (getField<string>(row, 'status') ?? '').toLowerCase() === value,
  },
  {
    id: 'createdAt',
    header: 'Submitted',
    accessor: (row) => formatDate(getField<unknown>(row, 'createdAt')),
    getValue: (row) => formatDate(getField<unknown>(row, 'createdAt')),
    sortAccessor: (row) => resolveTimestamp(getField<unknown>(row, 'createdAt')) ?? 0,
  },
  {
    id: 'type',
    header: 'Type',
    accessor: (row) => textOrPlaceholder(getField<string>(row, 'type')),
    getValue: (row) => getField<string>(row, 'type') ?? '',
  },
];

const dailyColumns: TableColumn<ContentEntry>[] = [
  {
    id: 'number',
    header: 'Challenge #',
    accessor: (row) => textOrPlaceholder(getField<number | string>(row, 'number')),
    getValue: (row) => getField<number | string>(row, 'number') ?? '',
    sortAccessor: (row) => Number(getField<number | string>(row, 'number') ?? 0),
  },
  {
    id: 'date',
    header: 'Date',
    accessor: (row) => formatDate(getField<unknown>(row, 'date')),
    getValue: (row) => formatDate(getField<unknown>(row, 'date')),
    sortAccessor: (row) => resolveTimestamp(getField<unknown>(row, 'date')) ?? 0,
  },
  {
    id: 'challengeAvailableUTC',
    header: 'Opens',
    accessor: (row) => formatDate(getField<unknown>(row, 'challengeAvailableUTC')),
    getValue: (row) => formatDate(getField<unknown>(row, 'challengeAvailableUTC')),
    sortAccessor: (row) => resolveTimestamp(getField<unknown>(row, 'challengeAvailableUTC')) ?? 0,
  },
  {
    id: 'answerRevealUTC',
    header: 'Answer Reveal',
    accessor: (row) => formatDate(getField<unknown>(row, 'answerRevealUTC')),
    getValue: (row) => formatDate(getField<unknown>(row, 'answerRevealUTC')),
    sortAccessor: (row) => resolveTimestamp(getField<unknown>(row, 'answerRevealUTC')) ?? 0,
  },
  {
    id: 'type',
    header: 'Mode',
    accessor: (row) => textOrPlaceholder(getField<string>(row, 'type')),
    getValue: (row) => getField<string>(row, 'type') ?? '',
  },
];

const sections: Record<ContentTab, SectionConfig> = {
  pyramids: {
    id: 'pyramids',
    label: 'Pyramid Items',
    description: 'Tier lists and rows available to build challenges.',
    data: pyramidCollection.data,
    isLoading: pyramidCollection.isLoading,
    error: pyramidCollection.error,
    refresh: pyramidCollection.refresh,
    columns: pyramidColumns,
    cardLayout: {
      primary: 'name',
      secondary: 'label',
      metadata: ['source', 'active', 'color'],
    },
  },
  trivia: {
    id: 'trivia',
    label: 'Trivia Questions',
    description: 'Multiple choice questions used in trivia modes.',
    data: triviaCollection.data,
    isLoading: triviaCollection.isLoading,
    error: triviaCollection.error,
    refresh: triviaCollection.refresh,
    columns: triviaColumns,
    cardLayout: {
      primary: 'text',
      secondary: 'category',
      metadata: ['correctAnswer', 'options'],
    },
    enableFilters: false,
  },
  community: {
    id: 'community',
    label: 'Community Submissions',
    description: 'Player-submitted ideas waiting for review.',
    data: communityCollection.data,
    isLoading: communityCollection.isLoading,
    error: communityCollection.error,
    refresh: communityCollection.refresh,
    columns: communityColumns,
    cardLayout: {
      primary: 'title',
      secondary: 'submittedBy',
      metadata: ['status', 'createdAt', 'type'],
    },
  },
  daily: {
    id: 'daily',
    label: 'Daily Challenges',
    description: 'Scheduled challenges and their publish windows.',
    data: dailyChallengesCollection.data,
    isLoading: dailyChallengesCollection.isLoading,
    error: dailyChallengesCollection.error,
    refresh: dailyChallengesCollection.refresh,
    columns: dailyColumns,
    cardLayout: {
      primary: 'number',
      secondary: 'date',
      metadata: ['challengeAvailableUTC', 'answerRevealUTC', 'type'],
    },
  },
};

const contentSections = computed(() => Object.values(sections));
const activeSection = computed(() => sections[activeTab.value]);

const emptyStates: Record<ContentTab, ReturnType<typeof h>> = {
  pyramids: h('p', { class: 'has-text-grey' }, 'No pyramid items found yet.'),
  trivia: h('p', { class: 'has-text-grey' }, 'No trivia questions have been added.'),
  community: h('p', { class: 'has-text-grey' }, 'Community submissions will appear here once players contribute.'),
  daily: h('p', { class: 'has-text-grey' }, 'No daily challenges scheduled. Create one to populate this list.'),
};

function setTab(tab: ContentTab) {
  activeTab.value = tab;
}

function setView(view: 'table' | 'cards') {
  activeView.value = view;
}

function refreshActive() {
  void activeSection.value?.refresh();
}

function getField<T>(item: ContentEntry, key: string): T | undefined {
  return item[key] as T | undefined;
}

function textOrPlaceholder(value: unknown): string {
  if (!value) return '—';
  if (Array.isArray(value)) {
    return value.length ? value.join(', ') : '—';
  }
  return String(value);
}

function resolveStatus(item: ContentEntry): 'active' | 'inactive' {
  const value = getField<boolean>(item, 'active');
  return value === false ? 'inactive' : 'active';
}

function resolveTimestamp(value: unknown): number | null {
  if (!value) return null;
  if (
    typeof value === 'object' &&
    value !== null &&
    'toDate' in value &&
    typeof (value as { toDate: () => Date }).toDate === 'function'
  ) {
    return (value as { toDate: () => Date }).toDate().getTime();
  }
  const date = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date.getTime();
}

function formatDate(value: unknown): string {
  if (!value) return '—';
  if (
    typeof value === 'object' &&
    value !== null &&
    'toDate' in value &&
    typeof (value as { toDate: () => Date }).toDate === 'function'
  ) {
    return (value as { toDate: () => Date }).toDate().toLocaleString();
  }
  const date = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString();
}
</script>

<style scoped>
.content-manager__header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  flex-wrap: wrap;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.content-manager__actions {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.content-manager__tabs {
  margin-bottom: 1rem;
}

.content-manager__description {
  margin-bottom: 1rem;
  color: #4a4a4a;
}

.content-manager__card-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: grid;
  gap: 0.5rem;
}

.content-manager__card-list li {
  display: flex;
  flex-direction: column;
}

.content-manager__card-list span:first-child {
  text-transform: uppercase;
  font-size: 0.75rem;
  color: #b5b5b5;
}

@media screen and (max-width: 768px) {
  .content-manager__actions {
    width: 100%;
    justify-content: space-between;
  }
}
</style>
