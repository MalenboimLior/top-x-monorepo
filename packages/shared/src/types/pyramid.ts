export interface ImageItem {
  id: number;
  label: string;
  src: string;
}

export interface PyramidSlot {
  image: ImageItem | null;
}