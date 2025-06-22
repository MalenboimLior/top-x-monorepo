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