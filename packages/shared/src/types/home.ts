import type { Game } from './game';

export type HomeOrderField = 'date' | 'players' | 'favorites' | 'sessions';
export type HomeOrderDirection = 'asc' | 'desc';

export interface HomeSectionOrder {
  field: HomeOrderField;
  direction: HomeOrderDirection;
}

export interface HomeCollectionConfig {
  sort: HomeSectionOrder;
  limit?: number | null;
}

export interface HomeFeaturedConfig {
  gameIds: string[];
}

export interface HomeBuildConfig {
  gameTypeIds: string[];
}

export interface HomePageConfig {
  featured: HomeFeaturedConfig;
  topX: HomeCollectionConfig;
  community: HomeCollectionConfig;
  hiddenGameIds: string[];
  build: HomeBuildConfig;
  updatedAt?: number;
  updatedBy?: string;
}

export const defaultHomePageConfig: HomePageConfig = {
  featured: {
    gameIds: [],
  },
  topX: {
    sort: {
      field: 'favorites',
      direction: 'desc',
    },
    limit: 8,
  },
  community: {
    sort: {
      field: 'favorites',
      direction: 'desc',
    },
    limit: 8,
  },
  hiddenGameIds: [],
  build: {
    gameTypeIds: [],
  },
};

export interface HomeGameOption {
  id: string;
  name: string;
  reference: Pick<Game, 'id' | 'name' | 'community' | 'language'>;
}
