export interface PyramidItem {
  id: string;
  label: string;
  name: string;
  src: string;
  description?: string;
  color?: string;
  active: boolean;
  source: string;
}

export interface SortOption {
  orderBy: 'id' | 'label' | 'color';
  order: 'asc' | 'desc';
}
export interface PyramidConfig {
  items: PyramidItem[];
  rows: PyramidRow[];
  sortItems: SortOption;
  HideRowLabel: boolean;
  shareImageTitle?: string;
  poolHeader?: string;
  worstHeader?: string;
  worstPoints?: number;
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
export interface PyramidStats {
  itemRanks: { [itemId: string]: { [tierId: string]: number } };
  totalPlayers: number;
  worstItemCounts: { [itemId: string]: number };
}