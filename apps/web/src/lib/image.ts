const PLACEHOLDER_GRADIENTS: Array<[string, string]> = [
  ['#dcefe1', '#f3e8d4'],
  ['#e6f0dc', '#d6e6f0'],
  ['#f2e9d8', '#e8dcc8'],
  ['#dbefe8', '#e3e8f0'],
  ['#f0e8df', '#ece0cf'],
];

function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }
  return hash;
}

export function imagePlaceholder(seed = ''): string {
  const [from, to] = PLACEHOLDER_GRADIENTS[hashString(seed) % PLACEHOLDER_GRADIENTS.length];
  const svg =
    '<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160">' +
    '<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">' +
    `<stop offset="0" stop-color="${from}"/><stop offset="1" stop-color="${to}"/>` +
    '</linearGradient></defs><rect width="160" height="160" fill="url(#g)"/></svg>';
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

export const DEFAULT_IMAGE_PLACEHOLDER = imagePlaceholder('e-horta');