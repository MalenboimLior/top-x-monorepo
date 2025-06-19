// Types used by the pyramid game
export interface ImageItem {
  id: string;
  label: string;
  src: string;
}

export interface PyramidSlot {
  image: ImageItem | null;
}