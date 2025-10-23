import { computed, defineComponent, h, type PropType } from 'vue';
import type { VNodeChild } from 'vue';
import type { CardLayout, TableColumn } from './tableTypes';
import './CardView.css';

type RenderCell<T> = (row: T, column: TableColumn<T>) => VNodeChild;

type ActionRenderer<T> = (row: T) => VNodeChild;

type RowIdentifier<T> = (row: T, index: number) => string | number;

type EditHandler<T> = (row: T) => void;

type DeleteHandler<T> = (row: T) => void;

const defaultEmptyMessage = 'No records available.';

export type CardViewProps<T> = {
  rows: T[];
  columns: TableColumn<T>[];
  renderCell: RenderCell<T>;
  getRowId?: RowIdentifier<T>;
  renderActions?: ActionRenderer<T>;
  onEdit?: EditHandler<T>;
  onDelete?: DeleteHandler<T>;
  emptyState?: VNodeChild;
  cardLayout?: CardLayout;
};

export default defineComponent({
  name: 'CardView',
  props: {
    rows: { type: Array as PropType<unknown[]>, required: true },
    columns: { type: Array as PropType<TableColumn<unknown>[]>, required: true },
    renderCell: { type: Function as PropType<RenderCell<unknown>>, required: true },
    getRowId: Function as PropType<RowIdentifier<unknown>>, // eslint-disable-line vue/require-default-prop
    renderActions: Function as PropType<ActionRenderer<unknown>>, // eslint-disable-line vue/require-default-prop
    onEdit: Function as PropType<EditHandler<unknown>>, // eslint-disable-line vue/require-default-prop
    onDelete: Function as PropType<DeleteHandler<unknown>>, // eslint-disable-line vue/require-default-prop
    emptyState: { type: Object as PropType<VNodeChild>, required: false },
    cardLayout: { type: Object as PropType<CardLayout>, required: false },
  },
  setup(props) {
    const primaryColumn = computed(() => {
      const requested = props.cardLayout?.primary;
      if (requested) {
        return props.columns.find((column) => column.id === requested);
      }
      return props.columns[0];
    });

    const secondaryColumn = computed(() => {
      const requested = props.cardLayout?.secondary;
      if (requested) {
        return props.columns.find((column) => column.id === requested);
      }
      return props.columns.length > 1 ? props.columns[1] : undefined;
    });

    const metadataColumns = computed(() => {
      const primaryId = primaryColumn.value?.id;
      const secondaryId = secondaryColumn.value?.id;

      if (props.cardLayout?.metadata?.length) {
        return props.cardLayout.metadata
          .map((id) => props.columns.find((column) => column.id === id))
          .filter((column): column is TableColumn<unknown> => Boolean(column && column.id !== primaryId && column.id !== secondaryId));
      }

      return props.columns.filter((column) => column.id !== primaryId && column.id !== secondaryId);
    });

    const hasActions = computed(
      () => Boolean(props.renderActions || props.onEdit || props.onDelete),
    );

    const resolveRowKey = (row: unknown, index: number) => {
      if (props.getRowId) {
        return props.getRowId(row, index);
      }
      return index;
    };

    const resolveContent = (row: unknown, column: TableColumn<unknown>) => {
      const content = props.renderCell(row, column);
      return content ?? '—';
    };

    const resolveEmptyState = () =>
      h('div', { class: 'card-view__empty' }, props.emptyState ?? defaultEmptyMessage);

    return () => {
      if (!props.rows.length) {
        return h('div', { class: 'card-view' }, [resolveEmptyState()]);
      }

      const cards = props.rows.map((row, index) => {
        const key = resolveRowKey(row, index);
        const primary = primaryColumn.value;
        const secondary = secondaryColumn.value;

        const headerChildren: VNodeChild[] = [];
        if (primary) {
          headerChildren.push(h('p', { class: 'title is-5' }, resolveContent(row, primary)));
        } else {
          headerChildren.push(h('p', { class: 'title is-5' }, String(key)));
        }

        if (secondary) {
          headerChildren.push(h('p', { class: 'subtitle is-6' }, resolveContent(row, secondary)));
        }

        const metaSection = metadataColumns.value.length
          ? h(
              'div',
              { class: 'card-view__meta' },
              metadataColumns.value.map((column) =>
                h('div', { class: 'card-view__meta-row', key: column.id }, [
                  h('span', { class: 'card-view__meta-label' }, column.header),
                  h('span', { class: 'card-view__meta-value' }, resolveContent(row, column)),
                ]),
              ),
            )
          : null;

        const contentChildren: VNodeChild[] = [h('header', { class: 'card-view__header' }, headerChildren)];
        if (metaSection) {
          contentChildren.push(metaSection);
        }

        const cardBody = h('div', { class: 'card-view__content' }, contentChildren);

        let actionsSection: VNodeChild | null = null;
        if (hasActions.value) {
          if (props.renderActions) {
            actionsSection = h('footer', { class: 'card-view__actions' }, [props.renderActions(row)]);
          } else {
            const buttons: VNodeChild[] = [];
            if (props.onEdit) {
              buttons.push(
                h(
                  'button',
                  {
                    class: 'button is-light',
                    type: 'button',
                    onClick: () => props.onEdit?.(row),
                  },
                  'Edit',
                ),
              );
            }
            if (props.onDelete) {
              buttons.push(
                h(
                  'button',
                  {
                    class: 'button is-danger is-light',
                    type: 'button',
                    onClick: () => props.onDelete?.(row),
                  },
                  'Delete',
                ),
              );
            }
            actionsSection = h('footer', { class: 'card-view__actions' }, buttons);
          }
        }

        const cardChildren: VNodeChild[] = [cardBody];
        if (actionsSection) {
          cardChildren.push(actionsSection);
        }

        return h('article', { class: ['card-view__card', 'card'], key }, cardChildren);
      });

      return h('div', { class: 'card-view' }, [h('div', { class: 'card-view__grid' }, cards)]);
    };
  },
});
