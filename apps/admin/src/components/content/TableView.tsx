import React, { useEffect, useMemo, useState } from 'react';

type Primitive = string | number | boolean | Date | null | undefined;

export type TableFilterOption = {
  label: string;
  value: string;
};

export type TableColumn<T> = {
  /** Unique identifier for the column */
  id: string;
  /** Column header label */
  header: string;
  /** Render function for the cell */
  accessor: (row: T) => React.ReactNode;
  /** Value used for search, filtering and sorting */
  getValue?: (row: T) => Primitive;
  /** Optional filter dropdown options */
  filterOptions?: TableFilterOption[];
  /** Custom filter predicate; defaults to strict equality */
  filterFn?: (row: T, filterValue: string) => boolean;
  /** Whether the column participates in search */
  searchable?: boolean;
  /** Whether the column can be sorted */
  sortable?: boolean;
  /** Optional dedicated accessor for sorting */
  sortAccessor?: (row: T) => Primitive;
  /** Additional class name for the column */
  className?: string;
};

type SortDirection = 'asc' | 'desc';

export type TableViewProps<T> = {
  /** Dataset to render */
  data: T[];
  /** Column schema describing how to render each field */
  columns: TableColumn<T>[];
  /** Resolve a unique key for each row */
  getRowId?: (row: T, index: number) => string | number;
  /** Optional title displayed above the table */
  title?: string;
  /** Label for the primary add button */
  addLabel?: string;
  /** Handler invoked when clicking the add button */
  onAdd?: () => void;
  /** Handler invoked when clicking the edit action */
  onEdit?: (row: T) => void;
  /** Handler invoked when clicking the delete action */
  onDelete?: (row: T) => void;
  /** Optional custom renderer for the actions cell */
  renderActions?: (row: T) => React.ReactNode;
  /** Placeholder text for the search input */
  searchPlaceholder?: string;
  /** Initial value for the search query */
  initialSearch?: string;
  /** Toggle the search input */
  enableSearch?: boolean;
  /** Toggle filter dropdowns */
  enableFilters?: boolean;
  /** Toggle sortable headers */
  enableSorting?: boolean;
  /** Empty state node */
  emptyState?: React.ReactNode;
};

function toComparable(value: Primitive): Primitive {
  if (value instanceof Date) {
    return value.getTime();
  }
  return value;
}

function asSearchableText(value: Primitive | React.ReactNode): string {
  if (value === null || value === undefined) {
    return '';
  }

  if (typeof value === 'string') {
    return value;
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (Array.isArray(value)) {
    return value.map((entry) => asSearchableText(entry)).join(' ');
  }

  if (typeof value === 'object' && 'props' in value) {
    const children = (value as { props?: { children?: React.ReactNode } }).props?.children;
    return asSearchableText(children ?? '');
  }

  return '';
}

export function TableView<T>(props: TableViewProps<T>) {
  const {
    data,
    columns,
    getRowId,
    title,
    addLabel = 'Add',
    onAdd,
    onEdit,
    onDelete,
    renderActions,
    searchPlaceholder = 'Search…',
    initialSearch = '',
    enableSearch = true,
    enableFilters = true,
    enableSorting = true,
    emptyState = <p className="has-text-grey">No records available.</p>,
  } = props;

  const hasActionsColumn = Boolean(onEdit || onDelete || renderActions);

  const searchableColumns = useMemo(
    () => columns.filter((column) => column.searchable !== false),
    [columns],
  );

  const initialFilters = useMemo(() => {
    const defaults: Record<string, string> = {};
    columns.forEach((column) => {
      if (column.filterOptions && column.filterOptions.length > 0) {
        defaults[column.id] = '';
      }
    });
    return defaults;
  }, [columns]);

  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [filters, setFilters] = useState<Record<string, string>>(initialFilters);
  const [sortState, setSortState] = useState<{ columnId?: string; direction: SortDirection }>({});

  useEffect(() => {
    setFilters(initialFilters);
  }, [initialFilters]);

  useEffect(() => {
    setSearchQuery(initialSearch);
  }, [initialSearch]);

  const filteredData = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    const matchesSearch = (row: T) => {
      if (!enableSearch || !normalizedQuery) {
        return true;
      }

      return searchableColumns.some((column) => {
        const rawValue = column.getValue ? column.getValue(row) : column.accessor(row);
        const text = asSearchableText(rawValue);
        return text.toLowerCase().includes(normalizedQuery);
      });
    };

    const matchesFilters = (row: T) => {
      if (!enableFilters) {
        return true;
      }

      return Object.entries(filters).every(([columnId, filterValue]) => {
        if (!filterValue) {
          return true;
        }
        const column = columns.find((candidate) => candidate.id === columnId);
        if (!column) {
          return true;
        }
        if (column.filterFn) {
          return column.filterFn(row, filterValue);
        }
        const value = column.getValue ? column.getValue(row) : column.accessor(row);
        const comparable = asSearchableText(value);
        return comparable === filterValue || comparable.toLowerCase() === filterValue.toLowerCase();
      });
    };

    const sorted = [...data].filter((row) => matchesSearch(row) && matchesFilters(row));

    if (!enableSorting || !sortState.columnId) {
      return sorted;
    }

    const column = columns.find((candidate) => candidate.id === sortState.columnId);
    if (!column) {
      return sorted;
    }

    const accessor = (
      column.sortAccessor ??
      column.getValue ??
      ((row: T) => asSearchableText(column.accessor(row)))
    ) as (row: T) => Primitive;

    if (!accessor) {
      return sorted;
    }

    return sorted.sort((a, b) => {
      const left = toComparable(accessor(a));
      const right = toComparable(accessor(b));

      if (left === undefined || left === null) {
        return right === undefined || right === null ? 0 : sortState.direction === 'asc' ? -1 : 1;
      }
      if (right === undefined || right === null) {
        return sortState.direction === 'asc' ? 1 : -1;
      }
      if (left < right) {
        return sortState.direction === 'asc' ? -1 : 1;
      }
      if (left > right) {
        return sortState.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });
  }, [columns, data, enableFilters, enableSearch, enableSorting, filters, searchQuery, searchableColumns, sortState.columnId, sortState.direction]);

  const toggleSort = (column: TableColumn<T>) => {
    if (!enableSorting || !column.sortable) {
      return;
    }

    setSortState((current) => {
      if (current.columnId !== column.id) {
        return { columnId: column.id, direction: 'asc' };
      }
      if (current.direction === 'asc') {
        return { columnId: column.id, direction: 'desc' };
      }
      return {};
    });
  };

  const updateFilter = (columnId: string, value: string) => {
    setFilters((current) => ({
      ...current,
      [columnId]: value,
    }));
  };

  return (
    <section className="box has-background-dark p-5">
      <div className="is-flex is-justify-content-space-between is-align-items-center mb-4">
        <div>
          {title ? <h2 className="title is-4 has-text-white">{title}</h2> : null}
          {enableSearch ? (
            <div className="field mt-3 mb-0">
              <div className="control has-icons-left">
                <input
                  className="input"
                  type="search"
                  placeholder={searchPlaceholder}
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                />
                <span className="icon is-small is-left">
                  <i className="fas fa-search" aria-hidden />
                </span>
              </div>
            </div>
          ) : null}
        </div>
        {onAdd ? (
          <button className="button is-primary" onClick={onAdd} type="button">
            {addLabel}
          </button>
        ) : null}
      </div>

      {enableFilters && Object.keys(filters).length > 0 ? (
        <div className="columns is-multiline mb-4">
          {columns
            .filter((column) => column.filterOptions && column.filterOptions.length > 0)
            .map((column) => (
              <div className="column is-3" key={column.id}>
                <label className="label has-text-white" htmlFor={`filter-${column.id}`}>
                  {column.header}
                </label>
                <div className="select is-fullwidth">
                  <select
                    id={`filter-${column.id}`}
                    value={filters[column.id] ?? ''}
                    onChange={(event) => updateFilter(column.id, event.target.value)}
                  >
                    <option value="">All</option>
                    {column.filterOptions?.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            ))}
        </div>
      ) : null}

      <div className="table-container">
        <table className="table is-fullwidth is-striped is-hoverable">
          <thead>
            <tr>
              {columns.map((column) => (
                <th
                  key={column.id}
                  className={column.className}
                  onClick={() => toggleSort(column)}
                  style={{ cursor: enableSorting && column.sortable ? 'pointer' : undefined }}
                >
                  <span className="is-flex is-align-items-center">
                    <span>{column.header}</span>
                    {enableSorting && column.sortable ? (
                      <span className="icon is-small ml-2">
                        {sortState.columnId === column.id ? (
                          sortState.direction === 'asc' ? (
                            <i className="fas fa-sort-up" aria-hidden />
                          ) : (
                            <i className="fas fa-sort-down" aria-hidden />
                          )
                        ) : (
                          <i className="fas fa-sort" aria-hidden />
                        )}
                      </span>
                    ) : null}
                  </span>
                </th>
              ))}
              {hasActionsColumn && <th className="has-text-right">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {filteredData.length === 0 ? (
              <tr>
                <td colSpan={columns.length + (hasActionsColumn ? 1 : 0)} className="has-text-centered">
                  {emptyState}
                </td>
              </tr>
            ) : (
              filteredData.map((row, index) => {
                const key = getRowId ? getRowId(row, index) : index;
                return (
                  <tr key={key}>
                    {columns.map((column) => (
                      <td key={column.id} className={column.className}>
                        {column.accessor(row)}
                      </td>
                    ))}
                    {hasActionsColumn && (
                      <td className="has-text-right">
                        {renderActions ? (
                          renderActions(row)
                        ) : (
                          <div className="buttons is-right">
                            {onEdit ? (
                              <button
                                className="button is-small is-info"
                                type="button"
                                onClick={() => onEdit(row)}
                              >
                                Edit
                              </button>
                            ) : null}
                            {onDelete ? (
                              <button
                                className="button is-small is-danger"
                                type="button"
                                onClick={() => onDelete(row)}
                              >
                                Delete
                              </button>
                            ) : null}
                          </div>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default TableView;
