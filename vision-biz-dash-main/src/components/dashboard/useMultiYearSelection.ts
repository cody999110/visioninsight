import { useCallback, useState } from "react";
import { DASHBOARD_YEARS } from "@/components/dashboard/chartTheme";

/** 多选年份：至少保留一年，默认最新年；适合两年对比。 */
export function useMultiYearSelection(
  initial: string[] = ["2025"],
  available: readonly string[] = DASHBOARD_YEARS,
) {
  const [selectedYears, setSelectedYears] = useState<string[]>(() =>
    initial.filter(y => available.includes(y)).length
      ? initial.filter(y => available.includes(y))
      : [available[available.length - 1] ?? "2025"],
  );

  const toggleYear = useCallback((year: string) => {
    setSelectedYears(prev => {
      if (prev.includes(year)) {
        return prev.length > 1 ? prev.filter(y => y !== year) : prev;
      }
      return [...prev, year].sort();
    });
  }, []);

  const syncAvailable = useCallback((nextAvailable: string[]) => {
    if (!nextAvailable.length) return;
    setSelectedYears(prev => {
      const kept = prev.filter(y => nextAvailable.includes(y));
      if (kept.length) return kept;
      return [nextAvailable[nextAvailable.length - 1]];
    });
  }, []);

  /** 对比时以较新年为主指标 */
  const primaryYear = [...selectedYears].sort().at(-1) ?? "2025";
  const compareYear = selectedYears.length >= 2
    ? [...selectedYears].sort().at(-2) ?? null
    : null;

  return {
    selectedYears: [...selectedYears].sort(),
    toggleYear,
    syncAvailable,
    primaryYear,
    compareYear,
    isCompare: selectedYears.length >= 2,
  };
}
