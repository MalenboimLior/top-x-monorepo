// Tier definitions used for pyramid layouts
export interface Tier {
  label: string;
  color: string;
  slots: number;
}
export interface Item {
  id: string;
  label: string;
  image: string;
}
export interface TierData {
  tiers: Tier[];
  items: Item[];
}