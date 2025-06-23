export interface PyramidItem {
  id: string;
  label: string;
  src: string;
  color?: string;
}
export interface PyramidConfig {
  items: PyramidItem[];
  rows: PyramidRow[];
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