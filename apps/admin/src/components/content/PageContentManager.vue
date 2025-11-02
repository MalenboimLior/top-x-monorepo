<template>
  <section class="page-content-manager">
    <div class="page-content-manager__toolbar">
      <div class="field">
        <label class="label" for="page-select">Page</label>
        <div class="control">
          <div class="select is-fullwidth">
            <select id="page-select" v-model="activePage">
              <option v-for="page in pages" :key="page.id" :value="page.id">{{ page.label }}</option>
            </select>
          </div>
        </div>
      </div>

      <div class="field">
        <label class="label" for="locale-select">Locale</label>
        <div class="control">
          <div class="select">
            <select id="locale-select" v-model="activeLocale">
              <option v-for="localeOption in locales" :key="localeOption.id" :value="localeOption.id">
                {{ localeOption.label }}
              </option>
            </select>
          </div>
        </div>
      </div>

      <div class="page-content-manager__actions">
        <button class="button is-light" type="button" @click="resetToDefaults" :disabled="isSaving">
          Reset to defaults
        </button>
        <button class="button is-link" type="button" @click="save" :class="{ 'is-loading': isSaving }">
          Save changes
        </button>
      </div>
    </div>

    <div v-if="isLoading" class="notification is-info is-light">Loading content…</div>
    <div v-else-if="error" class="notification is-danger is-light">{{ error.message }}</div>

    <div v-if="currentPage" class="page-content-manager__form">
      <article v-for="group in currentPage.groups" :key="group.id" class="box">
        <header class="page-content-manager__group-header">
          <h2 class="title is-5">{{ group.label }}</h2>
          <p v-if="group.description" class="subtitle is-6">{{ group.description }}</p>
        </header>

        <div class="columns is-multiline">
          <div v-for="field in group.fields" :key="field.key" class="column" :class="field.columnClass ?? 'is-half'">
            <div class="field">
              <label class="label" :for="field.key">{{ field.label }}</label>
              <div class="control" v-if="field.type === 'textarea'">
                <textarea
                  class="textarea"
                  :id="field.key"
                  v-model="formValues[field.key]"
                  :rows="field.rows ?? 4"
                  :placeholder="field.placeholder"
                ></textarea>
              </div>
              <div class="control" v-else>
                <input
                  class="input"
                  :id="field.key"
                  v-model="formValues[field.key]"
                  :type="field.type"
                  :placeholder="field.placeholder"
                />
              </div>
              <p v-if="field.help" class="help">{{ field.help }}</p>
            </div>
          </div>
        </div>
      </article>

      <article class="box">
        <header class="page-content-manager__group-header">
          <h2 class="title is-5">SEO</h2>
          <p class="subtitle is-6">Titles and descriptions used for search and social previews.</p>
        </header>

        <div class="columns is-multiline">
          <div class="column is-half">
            <div class="field">
              <label class="label" for="seo-title">Meta title</label>
              <div class="control">
                <input id="seo-title" v-model="seoValues.title" class="input" type="text" placeholder="Meta title" />
              </div>
              <p class="help">Suggested length: 55–65 characters.</p>
            </div>
          </div>
          <div class="column is-half">
            <div class="field">
              <label class="label" for="seo-keywords">Keywords</label>
              <div class="control">
                <input
                  id="seo-keywords"
                  v-model="seoValues.keywords"
                  class="input"
                  type="text"
                  placeholder="keyword1, keyword2"
                />
              </div>
              <p class="help">Comma-separated list for search engines (optional).</p>
            </div>
          </div>
          <div class="column is-full">
            <div class="field">
              <label class="label" for="seo-description">Meta description</label>
              <div class="control">
                <textarea
                  id="seo-description"
                  v-model="seoValues.description"
                  class="textarea"
                  rows="3"
                  placeholder="Meta description"
                ></textarea>
              </div>
              <p class="help">Aim for 140–160 characters describing the page.</p>
            </div>
          </div>
        </div>
      </article>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue';
import { usePageContentDoc, savePageContentLocale, PAGE_CONTENT_DEFAULTS } from '@top-x/shared';
import type { PageContentId, SupportedLocale } from '@top-x/shared';

interface FieldConfig {
  key: string;
  label: string;
  type: 'text' | 'textarea';
  placeholder?: string;
  help?: string;
  rows?: number;
  columnClass?: string;
}

interface FieldGroup {
  id: string;
  label: string;
  description?: string;
  fields: FieldConfig[];
}

interface PageDefinition {
  id: PageContentId;
  label: string;
  groups: FieldGroup[];
}

const pages: PageDefinition[] = [
  {
    id: 'contact',
    label: 'Contact Us',
    groups: [
      {
        id: 'hero',
        label: 'Hero',
        fields: [
          { key: 'hero.pill', label: 'Eyebrow', type: 'text' },
          { key: 'hero.title', label: 'Title', type: 'text' },
          { key: 'hero.subtitle', label: 'Subtitle', type: 'textarea', rows: 3 },
        ],
      },
      {
        id: 'talk',
        label: 'Talk to us section',
        fields: [
          { key: 'sections.talk.title', label: 'Title', type: 'text' },
          { key: 'sections.talk.body', label: 'Body', type: 'textarea', rows: 4 },
          { key: 'sections.talk.linkLabel', label: 'Link label', type: 'text' },
          {
            key: 'sections.talk.linkHref',
            label: 'Link URL',
            type: 'text',
            placeholder: 'mailto:support@top-x.co',
            help: 'Use mailto: or https:// links.',
          },
        ],
      },
      {
        id: 'follow',
        label: 'Follow section',
        fields: [
          { key: 'sections.follow.title', label: 'Title', type: 'text' },
          { key: 'sections.follow.body', label: 'Body', type: 'textarea', rows: 4 },
          { key: 'sections.follow.linkLabel', label: 'Link label', type: 'text' },
          {
            key: 'sections.follow.linkHref',
            label: 'Link URL',
            type: 'text',
            placeholder: 'https://x.com/Topxapp',
          },
        ],
      },
      {
        id: 'cta',
        label: 'Call to action',
        fields: [
          { key: 'cta.label', label: 'Button label', type: 'text' },
          { key: 'cta.href', label: 'Button link', type: 'text', placeholder: '/' },
        ],
      },
    ],
  },
  {
    id: 'build',
    label: 'Build page',
    groups: [
      {
        id: 'hero',
        label: 'Hero',
        fields: [
          { key: 'hero.pill', label: 'Eyebrow', type: 'text' },
          { key: 'hero.title', label: 'Title', type: 'text' },
          { key: 'hero.subtitle', label: 'Subtitle', type: 'textarea', rows: 3 },
        ],
      },
      {
        id: 'hero-cta',
        label: 'Hero CTA (logged out)',
        fields: [
          { key: 'hero.cta.reminder', label: 'Reminder text', type: 'text' },
          { key: 'hero.cta.button', label: 'Button label', type: 'text' },
        ],
      },
      {
        id: 'stats',
        label: 'Hero stats',
        fields: [
          { key: 'stats.templates.label', label: 'Templates label', type: 'text' },
          { key: 'stats.games.label', label: 'Games label', type: 'text' },
        ],
      },
      {
        id: 'locked',
        label: 'Locked card (logged out)',
        fields: [
          { key: 'locked.title', label: 'Title', type: 'text' },
          { key: 'locked.body', label: 'Body', type: 'textarea', rows: 3 },
          { key: 'locked.button', label: 'Button label', type: 'text' },
        ],
      },
      {
        id: 'templates',
        label: 'Templates panel',
        fields: [
          { key: 'templates.title', label: 'Title', type: 'text' },
          { key: 'templates.subtitle', label: 'Subtitle', type: 'textarea', rows: 3 },
          { key: 'templates.empty', label: 'Empty state', type: 'textarea', rows: 2 },
        ],
      },
      {
        id: 'games',
        label: 'My games panel',
        fields: [
          { key: 'games.title', label: 'Title', type: 'text' },
          { key: 'games.subtitle', label: 'Subtitle', type: 'textarea', rows: 3 },
          { key: 'games.empty', label: 'Empty state', type: 'textarea', rows: 2 },
        ],
      },
      {
        id: 'editor',
        label: 'Editor surface',
        fields: [
          { key: 'editor.back', label: 'Back button', type: 'text' },
          { key: 'editor.heading.create', label: 'Create heading', type: 'text', help: 'Use {template} placeholder for template name.' },
          { key: 'editor.heading.edit', label: 'Edit heading', type: 'text', help: 'Use {template} placeholder for template name.' },
          { key: 'editor.subtitle', label: 'Subtitle', type: 'textarea', rows: 3 },
        ],
      },
    ],
  },
  {
    id: 'terms',
    label: 'Terms of Use',
    groups: [
      {
        id: 'hero',
        label: 'Hero',
        fields: [
          { key: 'hero.pill', label: 'Eyebrow', type: 'text' },
          { key: 'hero.title', label: 'Title', type: 'text' },
          { key: 'hero.subtitle', label: 'Subtitle', type: 'text' },
        ],
      },
      {
        id: 'section-1',
        label: 'Section 1',
        fields: [
          { key: 'sections.1.title', label: 'Title', type: 'text' },
          { key: 'sections.1.body', label: 'Body', type: 'textarea', rows: 4 },
        ],
      },
      {
        id: 'section-2',
        label: 'Section 2',
        fields: [
          { key: 'sections.2.title', label: 'Title', type: 'text' },
          { key: 'sections.2.body', label: 'Body', type: 'textarea', rows: 4 },
        ],
      },
      {
        id: 'section-3',
        label: 'Section 3',
        fields: [
          { key: 'sections.3.title', label: 'Title', type: 'text' },
          { key: 'sections.3.body', label: 'Body', type: 'textarea', rows: 4 },
        ],
      },
      {
        id: 'cta',
        label: 'Call to action',
        fields: [
          { key: 'cta.label', label: 'Button label', type: 'text' },
          { key: 'cta.href', label: 'Button link', type: 'text' },
        ],
      },
    ],
  },
];

const locales = [
  { id: 'en', label: 'English' },
  { id: 'il', label: 'עברית' },
];

const activePage = ref<PageContentId>('contact');
const activeLocale = ref<SupportedLocale>('en');
const formValues = reactive<Record<string, string>>({});
const seoValues = reactive({ title: '', description: '', keywords: '' });
const isSaving = ref(false);

const pageContent = usePageContentDoc(activePage, activeLocale);

const isLoading = computed(() => pageContent.isLoading.value);
const error = computed(() => pageContent.error.value);

const currentPage = computed(() => pages.find((page) => page.id === activePage.value));

function applyValues(values: Record<string, string>, seo: { title?: string; description?: string; keywords?: string }) {
  Object.keys(formValues).forEach((key) => delete formValues[key]);
  Object.entries(values).forEach(([key, value]) => {
    formValues[key] = value;
  });
  seoValues.title = seo.title ?? '';
  seoValues.description = seo.description ?? '';
  seoValues.keywords = seo.keywords ?? '';
}

function getDefaults(pageId: PageContentId, locale: SupportedLocale) {
  const pageDefaults = PAGE_CONTENT_DEFAULTS[pageId]?.[locale];
  return {
    content: { ...(pageDefaults?.content ?? {}) },
    seo: { ...(pageDefaults?.seo ?? {}) },
  };
}

watch(
  [() => activePage.value, () => activeLocale.value, pageContent.content, pageContent.seo],
  () => {
    const defaults = getDefaults(activePage.value, activeLocale.value);
    const mergedContent = { ...defaults.content, ...pageContent.content.value };
    const mergedSeo = { ...defaults.seo, ...pageContent.seo.value };
    applyValues(mergedContent, mergedSeo);
  },
  { immediate: true },
);

function resetToDefaults() {
  const defaults = getDefaults(activePage.value, activeLocale.value);
  applyValues(defaults.content, defaults.seo);
}

async function save() {
  try {
    isSaving.value = true;
    await savePageContentLocale(activePage.value, activeLocale.value, {
      content: { ...formValues },
      seo: { ...seoValues },
    });
  } catch (err) {
    console.error('Failed to save page content', err);
  } finally {
    isSaving.value = false;
  }
}
</script>

<style scoped>
.page-content-manager {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.page-content-manager__toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  align-items: flex-end;
}

.page-content-manager__actions {
  display: flex;
  gap: 0.75rem;
}

.page-content-manager__form {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.page-content-manager__group-header {
  margin-bottom: 1rem;
}

.page-content-manager__group-header .title {
  margin-bottom: 0.25rem;
}

.page-content-manager__group-header .subtitle {
  margin-bottom: 0;
  color: #6b7280;
}

.columns + .columns {
  margin-top: 0.75rem;
}

.button.is-link {
  min-width: 8.5rem;
}

@media screen and (max-width: 768px) {
  .page-content-manager__toolbar {
    flex-direction: column;
    align-items: stretch;
  }

  .page-content-manager__actions {
    justify-content: flex-end;
  }
}
</style>
