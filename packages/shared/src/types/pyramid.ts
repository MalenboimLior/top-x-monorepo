export interface PyramidItem {
  id: string;
  label: string;
  name: string;
  src: string;
  color?: string;
}

export interface SortOption {
  orderBy: 'id' | 'label' | 'color';
  order: 'asc' | 'desc';
}
export interface PyramidConfig {
  items: PyramidItem[];
  rows: PyramidRow[];
  sortItems: SortOption;
}
export interface PyramidRow {
  id: number;
  label: string;
  points: number;
  color?: string;
}

export interface PyramidSlot {
  image: PyramidItem | null;
}

export interface PyramidData {
  pyramid: PyramidSlot[][];
  worstItem: PyramidItem | null;
}