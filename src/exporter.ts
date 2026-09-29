// Export: CSS is generated on demand from one pairing's own saved
// typography, so every downloaded file carries that pair's parameters.

import {Pair} from './model';

export function pairToCss(pair: Pair): string {
  const {headingFont, bodyFont, size, weight, leading, tracking} = pair.typography;
  return [
    `/* ${pair.title} */`,
    `.heading { font-family: '${headingFont}'; font-size: ${size}px; font-weight: ${weight}; letter-spacing: ${tracking}px; }`,
    `.body { font-family: '${bodyFont}'; line-height: ${leading}; letter-spacing: ${tracking / 2}px; }`,
    '',
  ].join('\n');
}

export function downloadPairCss(pair: Pair): void {
  const url = URL.createObjectURL(new Blob([pairToCss(pair)], {type: 'text/css'}));
  const a = document.createElement('a');
  a.href = url;
  const slug = pair.title.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'pairing';
  a.download = `${slug}.css`;
  a.click();
  URL.revokeObjectURL(url);
}
