// 工作区层：当前编辑会话的状态与操作。
// 只在内存中存在的东西（选中项、筛选、删除批次）放这里；
// 落本机存档统一通过 archive 层，不直接碰 localStorage。

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { loadPairs, savePairs } from '../archive/store';
import { DEFAULT_PARAMS, normalizeParams, type Pair, type PairParams } from '../model/types';

export type Filter =
  | { kind: 'all' }
  | { kind: 'favorites' }
  | { kind: 'category'; category: string };

/** 一批待撤回的删除：时间窗内连续删除合并进同一批次，撤回时整体还原 */
export type DeletedBatch = {
  id: number;
  at: number;
  /** 记录删除时的位置，撤回时按原位插回 */
  entries: { pair: Pair; index: number }[];
};

const BATCH_WINDOW_MS = 8000;

export function usePairStudio() {
  const [pairs, setPairs] = useState<Pair[]>(() => loadPairs());
  const [selectedId, setSelectedId] = useState<number>(() => pairs[0]?.id ?? 0);
  const [filter, setFilter] = useState<Filter>({ kind: 'all' });
  const [deletedBatches, setDeletedBatches] = useState<DeletedBatch[]>([]);
  /** 正在展示撤回提示的批次；时间窗到期后提示消失，批次仍保留可继续撤回 */
  const [activeBatchId, setActiveBatchId] = useState<number | null>(null);

  const pairsRef = useRef(pairs);
  const selectedIdRef = useRef(selectedId);
  const batchesRef = useRef(deletedBatches);
  const lastDeletedAtRef = useRef(0);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    pairsRef.current = pairs;
  }, [pairs]);
  useEffect(() => {
    selectedIdRef.current = selectedId;
  }, [selectedId]);
  useEffect(() => {
    batchesRef.current = deletedBatches;
  }, [deletedBatches]);

  // 持久化：配对的任何变化（含每套配对自己的画布参数）都写本机存档。
  useEffect(() => {
    savePairs(pairs);
  }, [pairs]);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

  const current = useMemo(
    () => pairs.find((p) => p.id === selectedId) ?? pairs[0] ?? null,
    [pairs, selectedId],
  );

  /** 修改当前配对自己的画布参数；切换配对或重开页面都会读到这套值。 */
  const updateParams = useCallback((patch: Partial<PairParams>) => {
    const id = selectedIdRef.current;
    setPairs((ps) =>
      ps.map((p) => (p.id === id ? { ...p, params: { ...p.params, ...patch } } : p)),
    );
  }, []);

  /** 重置：只把当前这套配对的画布参数还原为默认值，不碰其它配对。 */
  const resetCurrentParams = useCallback(() => {
    const id = selectedIdRef.current;
    setPairs((ps) =>
      ps.map((p) => (p.id === id ? { ...p, params: { ...DEFAULT_PARAMS } } : p)),
    );
  }, []);

  /** 新增配对：继承当前画布上的全部参数（字体、字号、字重、行高、字距）。 */
  const createPair = useCallback((title: string) => {
    const name = title.trim();
    if (!name) return;
    const id = Date.now();
    const source = pairsRef.current.find((p) => p.id === selectedIdRef.current);
    const pair: Pair = {
      id,
      title: name,
      heading: 'Your new headline',
      body: 'Start with a sentence that lets your type pairing show its character.',
      category: source?.category ?? 'Untitled',
      favorite: false,
      params: normalizeParams({ ...(source?.params ?? DEFAULT_PARAMS) }),
    };
    setPairs((ps) => [...ps, pair]);
    setSelectedId(id);
    setFilter({ kind: 'all' });
  }, []);

  const armToast = useCallback((batchId: number) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setActiveBatchId(batchId);
    toastTimerRef.current = setTimeout(() => {
      setActiveBatchId(null);
      lastDeletedAtRef.current = 0;
    }, BATCH_WINDOW_MS);
  }, []);

  const removePair = useCallback(
    (id: number) => {
      const ps = pairsRef.current;
      const index = ps.findIndex((p) => p.id === id);
      if (index === -1) return;
      const removed = ps[index];
      const rest = ps.filter((p) => p.id !== id);
      const nextId = rest[index]?.id ?? rest[index - 1]?.id ?? rest[0]?.id ?? null;

      setPairs(rest);
      if (nextId !== null) setSelectedId(nextId);

      const now = Date.now();
      const sameBatch = now - lastDeletedAtRef.current <= BATCH_WINDOW_MS;
      lastDeletedAtRef.current = now;

      // 事件触发时 ref 与已提交的状态一致；撤回会把时间戳清零，
      // 因此同窗口内最新批次一定还在栈里，直接取它的 id 即可。
      const head = batchesRef.current[batchesRef.current.length - 1];
      const batchId = sameBatch && head ? head.id : now;

      setDeletedBatches((batches) => {
        if (sameBatch && batches.length > 0) {
          const latest = batches[batches.length - 1];
          return [
            ...batches.slice(0, -1),
            { ...latest, at: now, entries: [...latest.entries, { pair: removed, index }] },
          ];
        }
        return [...batches, { id: now, at: now, entries: [{ pair: removed, index }] }];
      });
      armToast(batchId);
    },
    [armToast],
  );

  /** 撤回最近一批删除，全部按删除时的位置整体还原，并选中还原回来的配对。 */
  const undoLastDelete = useCallback(() => {
    const batches = batchesRef.current;
    if (batches.length === 0) return;
    const batch = batches[batches.length - 1];

    // 逆序还原：后删除的记录先插回，其插入位置是在“此前删除尚未发生”的
    // 状态上量出来的，逆序才能让每条记录都回到删除前的原始位置。
    let next = [...pairsRef.current];
    for (const entry of [...batch.entries].reverse()) {
      const at = Math.min(entry.index, next.length);
      next = [...next.slice(0, at), entry.pair, ...next.slice(at)];
    }
    setPairs(next);
    setDeletedBatches(batches.slice(0, -1));
    setActiveBatchId(null);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    lastDeletedAtRef.current = 0;
    const restoredId = batch.entries[0]?.pair.id;
    if (restoredId !== undefined) setSelectedId(restoredId);
  }, []);

  const toggleFavorite = useCallback((id: number) => {
    setPairs((ps) => ps.map((p) => (p.id === id ? { ...p, favorite: !p.favorite } : p)));
  }, []);

  const favoriteCount = useMemo(() => pairs.filter((p) => p.favorite).length, [pairs]);

  /** 集合 = 按真实记录的 category 分组，计数跟记录走 */
  const collections = useMemo(() => {
    const map = new Map<string, number>();
    for (const p of pairs) map.set(p.category, (map.get(p.category) ?? 0) + 1);
    return [...map.entries()].map(([category, count]) => ({ category, count }));
  }, [pairs]);

  const visiblePairs = useMemo(() => {
    if (filter.kind === 'favorites') return pairs.filter((p) => p.favorite);
    if (filter.kind === 'category') return pairs.filter((p) => p.category === filter.category);
    return pairs;
  }, [pairs, filter]);

  const activeBatch = useMemo(
    () => deletedBatches.find((b) => b.id === activeBatchId) ?? null,
    [deletedBatches, activeBatchId],
  );

  return {
    pairs,
    current,
    filter,
    setFilter,
    visiblePairs,
    favoriteCount,
    collections,
    selectedId,
    setSelectedId,
    updateParams,
    resetCurrentParams,
    createPair,
    removePair,
    toggleFavorite,
    deletedBatches,
    activeBatch,
    undoLastDelete,
  };
}
