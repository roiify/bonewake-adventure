// Display a number compactly so the top-bar currency chips don't overflow once
// the value passes 9,999. Below 10K we keep full precision with thousand
// separators (e.g. "9,999"); above that we shorten to K / M / B with one
// decimal trimmed to integer when it's clean (e.g. "12.3K", "1M", "2.5B").
export function formatCompact(n: number): string {
  if (n < 10000) return n.toLocaleString();
  const units: [number, string][] = [
    [1_000_000_000, 'B'],
    [1_000_000, 'M'],
    [1_000, 'K'],
  ];
  for (const [div, suffix] of units) {
    if (n >= div) {
      const v = n / div;
      const s = v >= 100 ? Math.floor(v).toString() : v.toFixed(1).replace(/\.0$/, '');
      return s + suffix;
    }
  }
  return n.toString();
}
