import type { VNodeChild } from 'vue';

export type Primitive = string | number | boolean | Date | null | undefined;

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

export type SortDirection = 'asc' | 'desc';

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
  viewMode?: 'table' | 'cards';
  cardLayout?: CardLayout;
};

export type CardLayout = {
  primary?: string;
  secondary?: string;
  metadata?: string[];
};

export type InternalSortState = {
  columnId?: string;
  direction: SortDirection;
};
