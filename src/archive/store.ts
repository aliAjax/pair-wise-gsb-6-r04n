// 本机存档层：只管 localStorage 的读写与版本迁移。
// 与工作区状态、导出逻辑完全分离；换 key 或迁移存储形态只动这里。

import { migratePair, seedPairs, type Pair } from '../model/types';

const STORAGE_KEY = 'type-pairer:workspace:v1';
// 旧版本使用的扁平 key：首次加载时迁移，迁移成功后不再读写它。
const LEGACY_KEY = 'type-pairs';
export const STORAGE_VERSION = 1;

type StoredShape = {
  version: number;
  pairs: Pair[];
};

/**
 * 从本机存档读取配对：
 * 1. 新版结构 { version, pairs }
 * 2. 旧版扁平数组（type-pairs）
 * 3. 任何解析失败都回退到内置示例
 * 旧记录统一经 migratePair 补齐 params 默认值。
 */
export function loadPairs(): Pair[] {
  const fallback = seedPairs();
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(STORAGE_KEY) ?? localStorage.getItem(LEGACY_KEY);
  } catch {
    return fallback;
  }
  if (!raw) return fallback;

  try {
    const parsed: unknown = JSON.parse(raw);
    const list = Array.isArray(parsed)
      ? parsed
      : parsed && typeof parsed === 'object' && Array.isArray((parsed as StoredShape).pairs)
        ? (parsed as StoredShape).pairs
        : null;
    if (!list) return fallback;

    const pairs = list
      .map((entry, i) => migratePair(entry, Date.now() + i))
      .filter((p): p is Pair => p !== null);

    // 迁移后的旧数据直接落进新 key，旧 key 保留到下一次成功保存后清理。
    return pairs.length ? pairs : fallback;
  } catch {
    return fallback;
  }
}

/** 写入本机存档。保存成功后清掉旧版扁平 key，彻底与旧数据解耦。 */
export function savePairs(pairs: Pair[]): boolean {
  const payload: StoredShape = { version: STORAGE_VERSION, pairs };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    if (localStorage.getItem(LEGACY_KEY) !== null) localStorage.removeItem(LEGACY_KEY);
    return true;
  } catch {
    return false;
  }
}
