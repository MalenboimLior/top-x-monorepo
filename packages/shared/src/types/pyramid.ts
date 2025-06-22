export interface ImageItem {
  id: string;
  src: string;
  label: string;
}

export interface PyramidSlot {
  image: ImageItem | null;
}

export interface PyramidData {
  pyramid: PyramidSlot[][];
  worstItem: ImageItem | null; // New field for worst item
}
export interface PyramidItem {
  id: string;
  src: string;
  label: string;
  color?: string;
}

export interface PyramidRow {
  id: number;
  label: string;
  points: number;
  color?: string;
}

export interface PyramidConfig {
  items: PyramidItem[];
  rows: PyramidRow[];
}