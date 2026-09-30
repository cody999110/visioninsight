/** Read HSL channel tokens from :root / data-theme and return usable CSS colors. */

function readToken(name: string): string {
  if (typeof document === "undefined") return "";
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

export function themeHsl(token: string, alpha?: number): string {
  const channels = readToken(token);
  if (!channels) {
    return alpha === undefined ? "hsl(262, 60%, 50%)" : `hsl(262 60% 50% / ${alpha})`;
  }
  if (alpha === undefined) return `hsl(${channels})`;
  return `hsl(${channels} / ${alpha})`;
}

/** Primary-tinted scale for choropleth maps (ratio 0–1). */
export function themeHeatColor(ratio: number): string {
  const primary = readToken("--primary") || "262 60% 50%";
  const [hRaw, sRaw] = primary.split(/\s+/);
  const h = hRaw || "262";
  const s = (sRaw || "60%").replace("%", "");
  if (ratio > 0.7) return `hsl(${h}, ${s}%, 35%)`;
  if (ratio > 0.5) return `hsl(${h}, ${s}%, 45%)`;
  if (ratio > 0.35) return `hsl(${h}, ${s}%, 55%)`;
  if (ratio > 0.2) return `hsl(${h}, ${Math.max(Number(s) - 10, 30)}%, 65%)`;
  if (ratio > 0.1) return `hsl(${h}, ${Math.max(Number(s) - 20, 20)}%, 78%)`;
  if (ratio > 0.03) return `hsl(${h}, ${Math.max(Number(s) - 30, 15)}%, 88%)`;
  return `hsl(${h}, 15%, 93%)`;
}

export interface YearPaint {
  solid: string;
  soft: string;
  line: string;
}

function paint(token: string, softAlpha = 0.22): YearPaint {
  return {
    solid: themeHsl(token),
    soft: themeHsl(token, softAlpha),
    line: themeHsl(token),
  };
}

/**
 * 对比色板：刻意不用 chart-1（多数主题下 ≈ primary），
 * 保证对比年与主色可辨，同时仍走各主题的 chart token。
 * 顺序：蓝青 / 琥珀 / 玫红 / 青绿
 */
const COMPARE_TOKENS = ["--chart-2", "--chart-4", "--chart-5", "--chart-3"] as const;

/**
 * 最新年（列表中数值最大，通常为当年）→ 主题主色；
 * 其余对比年 → 主题适配的区分色。
 */
export function colorsForYears(years: string[]): Record<string, YearPaint> {
  const sorted = [...years].sort();
  const latest = sorted[sorted.length - 1];
  const map: Record<string, YearPaint> = {};

  sorted.forEach(year => {
    if (year === latest) {
      map[year] = paint("--primary", 0.28);
      return;
    }
    // 按「距最新年的远近」分配对比色：越近越靠前
    const older = sorted.filter(y => y !== latest).sort((a, b) => Number(b) - Number(a));
    const index = Math.max(0, older.indexOf(year));
    map[year] = paint(COMPARE_TOKENS[index % COMPARE_TOKENS.length], 0.2);
  });

  return map;
}

/**
 * 收入趋势等固定年份映射：
 * 当年(2025)保持主色；更早年份用主题区分色（不用 chart-1，避免与 primary 撞色）。
 */
export function chartYearColors(): Record<string, { bar: string; line: string }> {
  return {
    "2021": { bar: themeHsl("--chart-5", 0.65), line: themeHsl("--chart-5") },
    "2022": { bar: themeHsl("--chart-3", 0.65), line: themeHsl("--chart-3") },
    "2023": { bar: themeHsl("--chart-4", 0.7), line: themeHsl("--chart-4") },
    "2024": { bar: themeHsl("--chart-2", 0.75), line: themeHsl("--chart-2") },
    "2025": { bar: themeHsl("--primary", 0.85), line: themeHsl("--primary") },
  };
}
