import { DASHBOARD_YEARS } from "@/components/dashboard/chartTheme";

interface YearChipsProps {
  years?: readonly string[];
  value?: string;
  onChange?: (year: string) => void;
  multi?: boolean;
  values?: string[];
  onToggle?: (year: string) => void;
  /** 年份 → 色值，用于对比时色点标识 */
  colors?: Record<string, string>;
}

export default function YearChips({
  years = DASHBOARD_YEARS,
  value,
  onChange,
  multi = false,
  values,
  onToggle,
  colors,
}: YearChipsProps) {
  return (
    <div className="flex items-center gap-1.5 flex-wrap shrink-0" onClick={e => e.stopPropagation()}>
      {multi && values && values.length >= 2 ? (
        <span className="text-[10px] text-muted-foreground mr-0.5">对比</span>
      ) : null}
      {years.map(year => {
        const active = multi ? values?.includes(year) : value === year;
        const swatch = colors?.[year];
        return (
          <button
            key={year}
            type="button"
            onClick={() => (multi && onToggle ? onToggle(year) : onChange?.(year))}
            className={`filter-chip inline-flex items-center gap-1.5 ${active ? "filter-chip-active" : ""}`}
          >
            {swatch && active ? (
              <span className="w-2 h-2 rounded-full shrink-0 ring-1 ring-black/5" style={{ background: swatch }} />
            ) : null}
            {year}
          </button>
        );
      })}
    </div>
  );
}
