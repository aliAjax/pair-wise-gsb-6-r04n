// 导出层：把当前配对的画布参数生成 CSS 并下载。
// 只依赖模型，不读工作区状态、不碰存档；换导出格式只动这里。

import type { Pair } from '../model/types';

const slug = (s: string) =>
  s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'pairing';

/** 导出的 CSS 带当前这套配对保存的全部画布参数。 */
export function buildPairCss(pair: Pair): string {
  const { headingFont, bodyFont, size, weight, leading, tracking } = pair.params;
  return `/* ${pair.title} */
.heading {
  font-family: '${headingFont}', serif;
  font-size: ${size}px;
  font-weight: ${weight};
  line-height: 1.05;
  letter-spacing: ${tracking}px;
}
.body {
  font-family: '${bodyFont}', sans-serif;
  font-size: 13px;
  line-height: ${leading};
  letter-spacing: ${tracking / 2}px;
}
`;
}

export function exportPairCss(pair: Pair) {
  const css = buildPairCss(pair);
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([css], { type: 'text/css' }));
  a.download = `type-pair-${slug(pair.title)}.css`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(a.href);
}
