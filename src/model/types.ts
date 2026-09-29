// 模型层：配对数据结构、画布参数、默认值与旧数据迁移。
// 不依赖 React、localStorage 或 DOM，可在任意环境复用。

export const FONTS = [
  'Fraunces',
  'DM Sans',
  'Space Grotesk',
  'Newsreader',
  'IBM Plex Sans',
  'Playfair Display',
] as const;

export type FontName = (typeof FONTS)[number];

/** 每套配对独立保存的画布参数 */
export type PairParams = {
  headingFont: FontName;
  bodyFont: FontName;
  size: number;
  weight: number;
  leading: number;
  tracking: number;
};

export const DEFAULT_PARAMS: PairParams = {
  headingFont: 'Fraunces',
  bodyFont: 'DM Sans',
  size: 46,
  weight: 600,
  leading: 1.25,
  tracking: 0,
};

export const PARAM_LIMITS = {
  size: { min: 28, max: 76, step: 1 },
  weight: { min: 300, max: 800, step: 100 },
  leading: { min: 1, max: 1.8, step: 0.05 },
  tracking: { min: -1, max: 3, step: 0.5 },
} as const;

export type Pair = {
  id: number;
  title: string;
  heading: string;
  body: string;
  category: string;
  favorite: boolean;
  params: PairParams;
};

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

const snap = (n: number, step: number) => Math.round(n / step) * step;

const isFont = (v: unknown): v is FontName =>
  typeof v === 'string' && (FONTS as readonly string[]).includes(v);

const asNumber = (v: unknown, fallback: number) =>
  typeof v === 'number' && Number.isFinite(v) ? v : fallback;

/**
 * 旧数据（没有 params，或 params 字段不全 / 越界）补齐默认值，
 * 保证任何来源的配对读出来都带一套完整合法的画布参数。
 */
export function normalizeParams(raw?: Partial<PairParams> | null): PairParams {
  const r = raw ?? {};
  const { size, weight, leading, tracking } = PARAM_LIMITS;
  return {
    headingFont: isFont(r.headingFont) ? r.headingFont : DEFAULT_PARAMS.headingFont,
    bodyFont: isFont(r.bodyFont) ? r.bodyFont : DEFAULT_PARAMS.bodyFont,
    size: clamp(snap(asNumber(r.size, DEFAULT_PARAMS.size), size.step), size.min, size.max),
    weight: clamp(snap(asNumber(r.weight, DEFAULT_PARAMS.weight), weight.step), weight.min, weight.max),
    leading: Number(
      clamp(snap(asNumber(r.leading, DEFAULT_PARAMS.leading), leading.step), leading.min, leading.max).toFixed(2),
    ),
    tracking: clamp(
      snap(asNumber(r.tracking, DEFAULT_PARAMS.tracking), tracking.step),
      tracking.min,
      tracking.max,
    ),
  };
}

const asString = (v: unknown, fallback: string) =>
  typeof v === 'string' && v.trim() ? v : fallback;

/** 迁移任意来源（旧版扁平结构 / 新版结构）的单条记录 */
export function migratePair(raw: unknown, fallbackId: number): Pair | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  return {
    id: Number.isFinite(Number(r.id)) ? Number(r.id) : fallbackId,
    title: asString(r.title, 'Untitled pairing'),
    heading: asString(r.heading, 'Your new headline'),
    body: asString(
      r.body,
      'Start with a sentence that lets your type pairing show its character.',
    ),
    category: asString(r.category, 'Untitled'),
    favorite: Boolean(r.favorite),
    params: normalizeParams((r as { params?: Partial<PairParams> }).params),
  };
}

/** 内置示例：每套配对自带一套不同的画布参数 */
export function seedPairs(): Pair[] {
  return [
    {
      id: 1,
      title: 'Editorial calm',
      heading: 'A slower way to see',
      body: 'Good typography creates space for ideas to breathe. Pair a confident display face with a quiet, generous text face.',
      category: 'Editorial',
      favorite: true,
      params: { ...DEFAULT_PARAMS },
    },
    {
      id: 2,
      title: 'Studio notes',
      heading: 'Make room for the unexpected',
      body: 'A thoughtful pairing can add rhythm to even the simplest interface. Try contrast in shape, not just size.',
      category: 'Portfolio',
      favorite: false,
      params: normalizeParams({
        headingFont: 'Space Grotesk',
        bodyFont: 'DM Sans',
        size: 40,
        weight: 500,
        leading: 1.3,
        tracking: 0.5,
      }),
    },
    {
      id: 3,
      title: 'Field guide',
      heading: 'Small details, lasting impressions',
      body: "Typography is the voice of a page. Find a combination that feels clear, warm and distinctly yours.",
      category: 'Brand',
      favorite: false,
      params: normalizeParams({
        headingFont: 'Playfair Display',
        bodyFont: 'IBM Plex Sans',
        size: 52,
        weight: 400,
        leading: 1.4,
        tracking: -0.5,
      }),
    },
  ];
}
