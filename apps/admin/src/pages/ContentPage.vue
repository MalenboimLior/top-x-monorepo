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

        <div v-else-if="activeItems.length === 0" class="notification is-info is-light">
          <p>No entries found yet. Start creating content to populate this section.</p>
        </div>

        <div v-else>
          <table v-if="activeView === 'table'" class="table is-fullwidth is-striped">
            <thead>
              <tr>
                <th v-for="column in activeSection?.columns" :key="column.key">{{ column.label }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in activeItems" :key="item.id">
                <td v-for="column in activeSection?.columns" :key="column.key">
                  {{ formatCell(item, column) }}
                </td>
              </tr>
            </tbody>
          </table>

          <div v-else class="columns is-multiline">
            <div
              class="column is-12-tablet is-6-desktop is-4-widescreen"
              v-for="item in activeItems"
              :key="item.id"
            >
              <Card>
                <p class="title is-5 mb-2">{{ formatPrimary(item, activeSection?.primaryField) }}</p>
                <p v-if="activeSection?.secondaryField" class="subtitle is-6 mb-3">
                  {{ formatSecondary(item, activeSection.secondaryField) }}
                </p>
                <ul class="content-manager__card-list">
                  <li v-for="column in activeSection?.columns" :key="column.key">
                    <span class="has-text-weight-semibold">{{ column.label }}:</span>
                    <span>{{ formatCell(item, column) }}</span>
                  </li>
                </ul>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import Card from '@top-x/shared/components/Card.vue';
import { useCollection, type UseCollectionResult } from '@top-x/shared/api/useCollection';
import type { PyramidItem } from '@top-x/shared/types/pyramid';
import type { TriviaQuestion } from '@top-x/shared/types/trivia';
import type { DailyChallenge } from '@top-x/shared/types/dailyChallenge';

interface CommunitySubmission {
  id: string;
  title?: string;
  submittedBy?: string;
  status?: string;
  createdAt?: string;
  type?: string;
}

interface ColumnDefinition {
  key: string;
  label: string;
  formatter?: (value: unknown, item: ContentEntry) => string;
}

interface SectionConfig {
  id: ContentTab;
  label: string;
  description: string;
  data: UseCollectionResult<ContentEntry>['data'];
  isLoading: UseCollectionResult<ContentEntry>['isLoading'];
  error: UseCollectionResult<ContentEntry>['error'];
  refresh: UseCollectionResult<ContentEntry>['refresh'];
  columns: ColumnDefinition[];
  primaryField: string;
  secondaryField?: string;
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

const sections: Record<ContentTab, SectionConfig> = {
  pyramids: {
    id: 'pyramids',
    label: 'Pyramid Items',
    description: 'Tier lists and rows available to build challenges.',
    data: pyramidCollection.data,
    isLoading: pyramidCollection.isLoading,
    error: pyramidCollection.error,
    refresh: pyramidCollection.refresh,
    columns: [
      { key: 'name', label: 'Name' },
      { key: 'label', label: 'Label' },
      { key: 'source', label: 'Source' },
      {
        key: 'active',
        label: 'Status',
        formatter: (value) => (value ? 'Active' : 'Inactive'),
      },
    ],
    primaryField: 'name',
    secondaryField: 'label',
  },
  trivia: {
    id: 'trivia',
    label: 'Trivia Questions',
    description: 'Multiple choice questions used in trivia modes.',
    data: triviaCollection.data,
    isLoading: triviaCollection.isLoading,
    error: triviaCollection.error,
    refresh: triviaCollection.refresh,
    columns: [
      { key: 'text', label: 'Question' },
      { key: 'category', label: 'Category' },
      {
        key: 'options',
        label: 'Choices',
        formatter: (value) => (Array.isArray(value) ? `${value.length} options` : '—'),
      },
      { key: 'correctAnswer', label: 'Answer' },
    ],
    primaryField: 'text',
    secondaryField: 'category',
  },
  community: {
    id: 'community',
    label: 'Community Submissions',
    description: 'Player-submitted ideas waiting for review.',
    data: communityCollection.data,
    isLoading: communityCollection.isLoading,
    error: communityCollection.error,
    refresh: communityCollection.refresh,
    columns: [
      { key: 'title', label: 'Title' },
      { key: 'submittedBy', label: 'Submitted By' },
      { key: 'status', label: 'Status' },
      {
        key: 'createdAt',
        label: 'Submitted',
        formatter: (value) => formatDate(value),
      },
      { key: 'type', label: 'Type' },
    ],
    primaryField: 'title',
    secondaryField: 'submittedBy',
  },
  daily: {
    id: 'daily',
    label: 'Daily Challenges',
    description: 'Scheduled challenges and their publish windows.',
    data: dailyChallengesCollection.data,
    isLoading: dailyChallengesCollection.isLoading,
    error: dailyChallengesCollection.error,
    refresh: dailyChallengesCollection.refresh,
    columns: [
      { key: 'number', label: 'Challenge #' },
      {
        key: 'date',
        label: 'Date',
        formatter: (value) => formatDate(value),
      },
      {
        key: 'challengeAvailableUTC',
        label: 'Opens',
        formatter: (value) => formatDate(value),
      },
      {
        key: 'answerRevealUTC',
        label: 'Answer Reveal',
        formatter: (value) => formatDate(value),
      },
      { key: 'type', label: 'Mode' },
    ],
    primaryField: 'number',
    secondaryField: 'date',
  },
};

const contentSections = computed(() => Object.values(sections));
const activeSection = computed(() => sections[activeTab.value]);
const activeItems = computed(() => activeSection.value?.data.value ?? []);

function setTab(tab: ContentTab) {
  activeTab.value = tab;
}

function setView(view: 'table' | 'cards') {
  activeView.value = view;
}

function refreshActive() {
  void activeSection.value?.refresh();
}

function extractValue(item: ContentEntry, key: string): unknown {
  return key.split('.').reduce<unknown>((acc, part) => {
    if (acc && typeof acc === 'object' && part in acc) {
      return (acc as Record<string, unknown>)[part];
    }
    return undefined;
  }, item);
}

function formatCell(item: ContentEntry, column: ColumnDefinition): string {
  const value = extractValue(item, column.key);
  if (column.formatter) {
    return column.formatter(value, item);
  }
  if (value === null || value === undefined || value === '') {
    return '—';
  }
  if (Array.isArray(value)) {
    return value.join(', ');
  }
  return String(value);
}

function formatPrimary(item: ContentEntry, key: string | undefined): string {
  if (!key) return item.id;
  const value = extractValue(item, key);
  if (typeof value === 'string' && value.length > 0) {
    return value;
  }
  if (typeof value === 'number') {
    return value.toString();
  }
  return item.id;
}

function formatSecondary(item: ContentEntry, key: string): string {
  const value = extractValue(item, key);
  if (!value) {
    return '';
  }
  if (typeof value === 'string') {
    return value;
  }
  if (typeof value === 'number') {
    return value.toString();
  }
  return String(value);
}

function formatDate(value: unknown): string {
  if (!value) return '—';
  if (typeof value === 'object' && value !== null && 'toDate' in value && typeof (value as { toDate: () => Date }).toDate === 'function') {
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
