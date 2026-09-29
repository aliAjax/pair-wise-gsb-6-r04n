// Workspace: ephemeral UI preference store, persisted under its own key so it
// never mixes with the local archive (pairs/trash) or with exported files.

import {CollectionFilter} from '../model';

const WORKSPACE_KEY = 'type-pairer:workspace';

export interface WorkspaceState {
  selectedId: number;
  filter: CollectionFilter;
}

export function loadWorkspace(fallbackId: number): WorkspaceState {
  const fallback: WorkspaceState = {selectedId: fallbackId, filter: {kind: 'all'}};
  try {
    const raw = localStorage.getItem(WORKSPACE_KEY);
    if (!raw) return fallback;
    const value = JSON.parse(raw) as Partial<WorkspaceState>;
    const filter = normalizeFilter(value.filter);
    return {
      selectedId: typeof value.selectedId === 'number' ? value.selectedId : fallbackId,
      filter,
    };
  } catch {
    return fallback;
  }
}

function normalizeFilter(value: unknown): CollectionFilter {
  if (typeof value === 'object' && value !== null) {
    const f = value as {kind?: unknown; category?: unknown};
    if (f.kind === 'all' || f.kind === 'favorites') return {kind: f.kind};
    if (f.kind === 'category' && typeof f.category === 'string') {
      return {kind: 'category', category: f.category};
    }
  }
  return {kind: 'all'};
}

export function saveWorkspace(state: WorkspaceState): void {
  try {
    localStorage.setItem(WORKSPACE_KEY, JSON.stringify(state));
  } catch {
    /* ignore */
  }
}
