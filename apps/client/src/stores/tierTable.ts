import { defineStore } from 'pinia';

export interface TierItem {
  id: number;
  name: string;
}

export interface Tier {
  id: number;
  name: string;
  color: string;
  items: TierItem[];
}

export const useTierTableStore = defineStore('tierTable', {
  state: () => ({
    tiers: [
      { id: 1, name: 'S', color: '#ff595e', items: [] },
      { id: 2, name: 'A', color: '#ffca3a', items: [] },
      { id: 3, name: 'B', color: '#8ac926', items: [] },
      { id: 4, name: 'C', color: '#1982c4', items: [] },
      { id: 5, name: 'D', color: '#6a4c93', items: [] },
    ] as Tier[],
    itemPool: [] as TierItem[],
    error: '',
    nextItemId: 1,
  }),
  actions: {
    addItem(name: string) {
      this.itemPool.push({ id: this.nextItemId++, name });
      this.error = '';
    },
    setError(msg: string) {
      this.error = msg;
    },
    resetTable() {
      this.tiers.forEach(tier => (tier.items = []));
      this.itemPool = [];
      this.error = '';
      this.nextItemId = 1;
    },
    clearTable() {
      this.tiers.forEach(tier => (tier.items = []));
      this.itemPool = [];
      this.error = '';
    },
    saveState() {
      // Optionally implement persistence here
    },
  },
});