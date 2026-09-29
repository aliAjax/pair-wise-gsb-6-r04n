// Local archive: persists the pairing library and the trash can.
// Separate from the workspace prefs (see workspace.ts) and from exports.
// Migrates the legacy single `type-pairs` key and backfills typography defaults.

import {Pair, SEED_PAIRS, TrashBatch, withDefaults} from '../model';

const PAIRS_KEY = 'type-pairer:pairs';
const TRASH_KEY = 'type-pairer:trash';
const LEGACY_KEY = 'type-pairs';

function readJson<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function isPairish(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && 'id' in value && 'title' in value;
}

function parsePairs(value: unknown): Pair[] | null {
  if (!Array.isArray(value) || !value.every(isPairish)) return null;
  return value.map((p) =>
    withDefaults({
      id: Number(p.id),
      title: String(p.title ?? ''),
      heading: String(p.heading ?? ''),
      body: String(p.body ?? ''),
      category: String(p.category ?? 'Untitled'),
      favorite: Boolean(p.favorite),
      typography: (p.typography ?? {}) as Pair['typography'],
    }),
  );
}

/** Runs once: adopts the old `type-pairs` archive and removes the legacy key. */
function migrateLegacy(): void {
  try {
    if (localStorage.getItem(PAIRS_KEY) !== null) return;
    const legacy = readJson<unknown>(LEGACY_KEY);
    if (legacy === null) return;
    const parsed = parsePairs(legacy);
    if (parsed) {
      localStorage.setItem(PAIRS_KEY, JSON.stringify(parsed));
    }
    localStorage.removeItem(LEGACY_KEY);
  } catch {
    /* storage unavailable — fall through to seed */
  }
}

export function loadPairs(): Pair[] {
  migrateLegacy();
  const stored = parsePairs(readJson<unknown>(PAIRS_KEY));
  if (stored) return stored;
  return SEED_PAIRS;
}

export function savePairs(pairs: Pair[]): void {
  try {
    localStorage.setItem(PAIRS_KEY, JSON.stringify(pairs));
  } catch {
    /* ignore quota / privacy-mode failures */
  }
}

export function loadTrash(): TrashBatch[] {
  const value = readJson<unknown>(TRASH_KEY);
  if (!Array.isArray(value)) return [];
  return value
    .filter(
      (b): b is Record<string, unknown> =>
        typeof b === 'object' && b !== null && Array.isArray((b as Record<string, unknown>).pairs),
    )
    .map((b) => ({
      id: Number(b.id),
      deletedAt: Number(b.deletedAt),
      pairs: parsePairs(b.pairs) ?? [],
    }))
    .filter((b) => b.pairs.length > 0);
}

export function saveTrash(trash: TrashBatch[]): void {
  try {
    localStorage.setItem(TRASH_KEY, JSON.stringify(trash));
  } catch {
    /* ignore */
  }
}
