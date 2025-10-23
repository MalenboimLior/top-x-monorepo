<template>
  <div class="box table-view">
    <div class="level mb-4" v-if="title || onAdd">
      <div class="level-left" v-if="title">
        <div class="level-item">
          <h2 class="title is-4">{{ title }}</h2>
        </div>
      </div>
      <div class="level-right" v-if="onAdd">
        <div class="level-item">
          <button class="button is-primary" type="button" @click="onAdd?.()">
            {{ addLabel }}
          </button>
        </div>
      </div>
    </div>

    <div
      v-if="(enableSearch && columns.length > 0) || (enableFilters && filterableColumns.length > 0)"
      class="filters mb-4"
    >
      <div class="field is-grouped is-align-items-flex-end is-flex-wrap-wrap">
        <div v-if="enableSearch" class="control is-expanded mb-2">
          <label class="label" v-if="searchLabel">{{ searchLabel }}</label>
          <input
            v-model="searchQuery"
            class="input"
            type="search"
            :placeholder="searchPlaceholder"
          />
        </div>
        <div
          v-for="column in filterableColumns"
          :key="column.id"
          class="control mb-2"
        >
          <label class="label">{{ column.header }}</label>
          <div class="select is-fullwidth">
            <select v-model="filters[column.id]">
              <option value="">All</option>
              <option
                v-for="option in column.filterOptions"
                :key="option.value"
                :value="option.value"
              >
                {{ option.label }}
              </option>
            </select>
          </div>
        </div>
      </div>
    </div>

    <div class="table-container">
      <table class="table is-fullwidth is-striped is-hoverable">
        <thead>
          <tr>
            <th
              v-for="column in columns"
              :key="column.id"
              :class="[{ 'is-clickable': enableSorting && column.sortable !== false }, column.className]
              "
              scope="col"
              @click="toggleSort(column)"
            >
              <span>{{ column.header }}</span>
              <span v-if="enableSorting && column.sortable !== false" class="sort-icon">
                <span v-if="sortState.columnId === column.id">
                  {{ sortState.direction === 'desc' ? '▼' : '▲' }}
                </span>
                <span v-else class="has-text-grey-light">▲▼</span>
              </span>
            </th>
            <th v-if="hasActionsColumn" scope="col" class="has-text-right">Actions</th>
          </tr>
        </thead>
        <tbody v-if="displayedRows.length > 0">
          <tr v-for="(row, index) in displayedRows" :key="resolveRowKey(row, index)">
            <td v-for="column in columns" :key="column.id" :class="column.className">
              <component :is="renderCell(row, column)" />
            </td>
            <td v-if="hasActionsColumn" class="has-text-right">
              <div class="buttons are-small is-justify-content-flex-end">
                <component v-if="renderActions" :is="renderActionsContent(row)" />
                <slot v-else name="actions" :row="row">
                  <button
                    v-if="onEdit"
                    class="button is-light"
                    type="button"
                    @click="() => onEdit?.(row)"
                  >
                    Edit
                  </button>
                  <button
                    v-if="onDelete"
                    class="button is-danger is-light"
                    type="button"
                    @click="() => onDelete?.(row)"
                  >
                    Delete
                  </button>
                </slot>
              </div>
            </td>
          </tr>
        </tbody>
        <tbody v-else>
          <tr>
            <td :colspan="columns.length + (hasActionsColumn ? 1 : 0)" class="has-text-centered">
              <component :is="emptyStateContent" />
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, h, isVNode, ref, watch } from 'vue';
import type { VNodeChild } from 'vue';

type Primitive = string | number | boolean | Date | null | undefined;

export type TableFilterOption = {
  label: string;
  value: string;
};

export type TableColumn<T> = {
  id: string;
  header: string;
  accessor: (row: T) => VNodeChild;
  getValue?: (row: T) => Primitive;
  filterOptions?: TableFilterOption[];
  filterFn?: (row: T, filterValue: string) => boolean;
  searchable?: boolean;
  sortable?: boolean;
  sortAccessor?: (row: T) => Primitive;
  className?: string;
};

type SortDirection = 'asc' | 'desc';

export type TableViewProps<T> = {
  data: T[];
  columns: TableColumn<T>[];
  getRowId?: (row: T, index: number) => string | number;
  title?: string;
  addLabel?: string;
  onAdd?: () => void;
  onEdit?: (row: T) => void;
  onDelete?: (row: T) => void;
  renderActions?: (row: T) => VNodeChild;
  searchPlaceholder?: string;
  searchLabel?: string;
  initialSearch?: string;
  enableSearch?: boolean;
  enableFilters?: boolean;
  enableSorting?: boolean;
  emptyState?: VNodeChild;
};

type InternalSortState = {
  columnId?: string;
  direction: SortDirection;
};

const defaultEmptyState = h('p', { class: 'has-text-grey' }, 'No records available.');

const props = withDefaults(defineProps<TableViewProps<unknown>>(), {
  addLabel: 'Add',
  searchPlaceholder: 'Search…',
  initialSearch: '',
  enableSearch: true,
  enableFilters: true,
  enableSorting: true,
});

const searchQuery = ref(props.initialSearch ?? '');
const filters = ref<Record<string, string>>({});
const sortState = ref<InternalSortState>({ columnId: undefined, direction: 'asc' });

watch(
  () => props.initialSearch,
  (value) => {
    searchQuery.value = value ?? '';
  },
);

watch(
  () => props.columns,
  () => {
    resetFilters();
    sortState.value = { columnId: undefined, direction: 'asc' };
  },
  { deep: true, immediate: true },
);

const filterableColumns = computed(() =>
  props.columns.filter((column) => column.filterOptions && column.filterOptions.length > 0),
);

watch(
  filterableColumns,
  () => {
    resetFilters();
  },
  { immediate: true },
);

const hasActionsColumn = computed(() => Boolean(props.onEdit || props.onDelete || props.renderActions));

const normalizedQuery = computed(() => searchQuery.value.trim().toLowerCase());

const filteredRows = computed(() => {
  const rows = props.data ?? [];

  return rows.filter((row) => {
    return matchesSearch(row) && matchesFilters(row);
  });
});

const displayedRows = computed(() => {
  const rows = [...filteredRows.value];
  if (!props.enableSorting || !sortState.value.columnId) {
    return rows;
  }

  const column = props.columns.find((entry) => entry.id === sortState.value.columnId);
  if (!column) {
    return rows;
  }

  const direction = sortState.value.direction ?? 'asc';

  return rows.sort((a, b) => compareRows(a, b, column, direction));
});

const emptyStateContent = computed(() => props.emptyState ?? defaultEmptyState);

function resetFilters() {
  const defaults: Record<string, string> = {};
  for (const column of filterableColumns.value) {
    defaults[column.id] = filters.value[column.id] ?? '';
  }
  filters.value = defaults;
}

function matchesFilters(row: unknown): boolean {
  if (!props.enableFilters) {
    return true;
  }

  for (const column of filterableColumns.value) {
    const activeValue = filters.value[column.id];
    if (!activeValue) {
      continue;
    }

    if (column.filterFn) {
      if (!column.filterFn(row, activeValue)) {
        return false;
      }
      continue;
    }

    const comparable = resolveFilterValue(row, column);
    if (String(comparable) !== activeValue) {
      return false;
    }
  }

  return true;
}

function matchesSearch(row: unknown): boolean {
  if (!props.enableSearch || !normalizedQuery.value) {
    return true;
  }

  const searchableColumns = props.columns.filter((column) => column.searchable !== false);
  return searchableColumns.some((column) => {
    const value = column.getValue ? column.getValue(row) : column.accessor(row);
    return asSearchableText(value).includes(normalizedQuery.value);
  });
}

function compareRows(
  a: unknown,
  b: unknown,
  column: TableColumn<unknown>,
  direction: SortDirection,
): number {
  if (column.sortable === false) {
    return 0;
  }

  const aValue = resolvePrimitive(a, column);
  const bValue = resolvePrimitive(b, column);

  const normalizedA = normalizeSortValue(aValue);
  const normalizedB = normalizeSortValue(bValue);

  if (normalizedA == null && normalizedB == null) return 0;
  if (normalizedA == null) return direction === 'asc' ? 1 : -1;
  if (normalizedB == null) return direction === 'asc' ? -1 : 1;

  if (normalizedA < normalizedB) {
    return direction === 'asc' ? -1 : 1;
  }
  if (normalizedA > normalizedB) {
    return direction === 'asc' ? 1 : -1;
  }
  return 0;
}

function resolvePrimitive(row: unknown, column: TableColumn<unknown>): Primitive {
  if (column.sortAccessor) {
    return column.sortAccessor(row);
  }

  if (column.getValue) {
    return column.getValue(row);
  }

  const rendered = column.accessor(row);
  if (typeof rendered === 'string' || typeof rendered === 'number' || typeof rendered === 'boolean') {
    return rendered;
  }
  if (rendered instanceof Date) {
    return rendered;
  }
  return asSearchableText(rendered);
}

function resolveFilterValue(row: unknown, column: TableColumn<unknown>): Primitive | string {
  if (column.getValue) {
    return column.getValue(row);
  }

  if (column.sortAccessor) {
    return column.sortAccessor(row);
  }

  const rendered = column.accessor(row);
  if (typeof rendered === 'string' || typeof rendered === 'number' || typeof rendered === 'boolean') {
    return rendered;
  }
  if (rendered instanceof Date) {
    return rendered;
  }
  return extractText(rendered, false);
}

function normalizeSortValue(value: Primitive): Primitive {
  if (value == null) {
    return value;
  }

  if (value instanceof Date) {
    return value.getTime();
  }

  if (typeof value === 'string') {
    return value.toLowerCase();
  }

  return value;
}

function asSearchableText(value: Primitive | VNodeChild): string {
  return extractText(value, true);
}

function extractText(value: Primitive | VNodeChild, lowercase = false): string {
  if (value == null) {
    return '';
  }

  const normalize = (input: string) => (lowercase ? input.toLowerCase() : input);

  if (Array.isArray(value)) {
    return value.map((entry) => extractText(entry, lowercase)).join(' ');
  }

  if (typeof value === 'string') {
    return normalize(value);
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return normalize(String(value));
  }

  if (value instanceof Date) {
    return normalize(value.toISOString());
  }

  if (isVNode(value)) {
    if (typeof value.children === 'string') {
      return normalize(value.children);
    }
    if (Array.isArray(value.children)) {
      return value.children.map((child) => extractText(child as VNodeChild, lowercase)).join(' ');
    }
    return '';
  }

  if (typeof value === 'object') {
    return Object.values(value as Record<string, unknown>)
      .map((entry) => extractText(entry as VNodeChild, lowercase))
      .join(' ');
  }

  return '';
}

function toggleSort(column: TableColumn<unknown>) {
  if (!props.enableSorting || column.sortable === false) {
    return;
  }

  if (sortState.value.columnId === column.id) {
    sortState.value =
      sortState.value.direction === 'asc'
        ? { columnId: column.id, direction: 'desc' }
        : { columnId: undefined, direction: 'asc' };
  } else {
    sortState.value = { columnId: column.id, direction: 'asc' };
  }
}

function resolveRowKey(row: unknown, index: number) {
  return props.getRowId ? props.getRowId(row, index) : index;
}

function renderCell(row: unknown, column: TableColumn<unknown>) {
  const content = column.accessor(row);
  if (isRenderableVNode(content)) {
    return content;
  }

  if (Array.isArray(content)) {
    return h('span', content.map((entry) => formatDisplayValue(entry)).join(', '));
  }

  if (content == null) {
    return h('span', '');
  }

  return h('span', String(content));
}

function isRenderableVNode(value: VNodeChild) {
  if (isVNode(value)) {
    return true;
  }

  if (typeof value === 'function') {
    return true;
  }

  if (value && typeof value === 'object') {
    return 'render' in (value as Record<string, unknown>) || 'setup' in (value as Record<string, unknown>) || 'template' in (value as Record<string, unknown>);
  }

  return false;
}

function renderActionsContent(row: unknown) {
  if (!props.renderActions) {
    return null;
  }

  const content = props.renderActions(row);
  if (isRenderableVNode(content)) {
    return content;
  }

  if (Array.isArray(content)) {
    return h('div', content);
  }

  if (content == null) {
    return null;
  }

  return h('span', String(content));
}

function formatDisplayValue(value: unknown): string {
  if (value == null) {
    return '';
  }

  if (Array.isArray(value)) {
    return value.map((entry) => formatDisplayValue(entry)).join(', ');
  }

  if (typeof value === 'object' || typeof value === 'function') {
    return extractText(value as VNodeChild, false);
  }

  return String(value);
}
</script>

<style scoped>
.table-view {
  background-color: #1f1f1f;
}

.table-view .table th.is-clickable {
  cursor: pointer;
}

.table-view .table .sort-icon {
  margin-left: 0.25rem;
  font-size: 0.75em;
}

.table-view .filters .label {
  color: #fff;
}
</style>
