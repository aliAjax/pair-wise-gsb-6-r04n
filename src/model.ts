// Domain model: types, defaults, seed data and pure record helpers.
// This module owns no storage and no UI.

export interface Typography {
  headingFont: string;
  bodyFont: string;
  size: number;
  weight: number;
  leading: number;
  tracking: number;
}

export interface Pair {
  id: number;
  title: string;
  heading: string;
  body: string;
  category: string;
  favorite: boolean;
  typography: Typography;
}

export interface TrashBatch {
  id: number;
  deletedAt: number;
  pairs: Pair[];
}

export type CollectionFilter =
  | { kind: 'all' }
  | { kind: 'favorites' }
  | { kind: 'category'; category: string };

export const FONT_OPTIONS = [
  'Fraunces',
  'DM Sans',
  'Space Grotesk',
  'Newsreader',
  'IBM Plex Sans',
  'Playfair Display',
];

export const DEFAULT_TYPOGRAPHY: Typography = {
  headingFont: 'Fraunces',
  bodyFont: 'DM Sans',
  size: 46,
  weight: 600,
  leading: 1.25,
  tracking: 0,
};

export function makeTypography(overrides: Partial<Typography> = {}): Typography {
  return { ...DEFAULT_TYPOGRAPHY, ...overrides };
}

export const SEED_PAIRS: Pair[] = [
  {
    id: 1,
    title: 'Editorial calm',
    heading: 'A slower way to see',
    body: 'Good typography creates space for ideas to breathe. Pair a confident display face with a quiet, generous text face.',
    category: 'Editorial',
    favorite: true,
    typography: makeTypography(),
  },
  {
    id: 2,
    title: 'Studio notes',
    heading: 'Make room for the unexpected',
    body: 'A thoughtful pairing can add rhythm to even the simplest interface. Try contrast in shape, not just size.',
    category: 'Portfolio',
    favorite: false,
    typography: makeTypography({
      headingFont: 'Playfair Display',
      bodyFont: 'IBM Plex Sans',
      size: 42,
      weight: 500,
      leading: 1.4,
    }),
  },
  {
    id: 3,
    title: 'Field guide',
    heading: 'Small details, lasting impressions',
    body: 'Typography is the voice of a page. Find a combination that feels clear, warm and distinctly yours.',
    category: 'Brand',
    favorite: false,
    typography: makeTypography({
      headingFont: 'Newsreader',
      bodyFont: 'Space Grotesk',
      size: 40,
      weight: 500,
      leading: 1.5,
      tracking: -0.5,
    }),
  },
];

/**
 * Backfill any missing typography fields on records written by older
 * versions of the app (which only stored id/title/heading/body/category/favorite).
 */
export function withDefaults(pair: Omit<Pair, 'typography'> & { typography?: Partial<Typography> }): Pair {
  return {
    ...pair,
    favorite: pair.favorite ?? false,
    typography: makeTypography(pair.typography),
  };
}

export interface CollectionSummary {
  name: string;
  count: number;
}

/** Collections are derived from the real records: one per category, in first-seen order. */
export function collectionList(pairs: Pair[]): CollectionSummary[] {
  const order: string[] = [];
  const counts = new Map<string, number>();
  for (const p of pairs) {
    if (!counts.has(p.category)) {
      counts.set(p.category, 0);
      order.push(p.category);
    }
    counts.set(p.category, (counts.get(p.category) ?? 0) + 1);
  }
  return order.map((name) => ({ name, count: counts.get(name) ?? 0 }));
}

const COLLECTION_COLORS = ['#e8b7a0', '#9fc9be', '#b4add8', '#e5c98f', '#8fb7d4', '#d8a7c0', '#a8c99a'];

export function collectionColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) | 0;
  }
  return COLLECTION_COLORS[Math.abs(hash) % COLLECTION_COLORS.length];
}
