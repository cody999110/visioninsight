import type { CSSProperties } from "react";

/** Shared Recharts chrome that follows CSS theme tokens. */

export function chartTooltipStyle(): CSSProperties {
  return {
    background: "hsl(var(--card))",
    border: "1px solid hsl(var(--border))",
    borderRadius: "10px",
    fontSize: 12,
    color: "hsl(var(--foreground))",
    boxShadow: "var(--shadow-card)",
  };
}

export function chartAxisTick() {
  return { fill: "hsl(var(--muted-foreground))", fontSize: 11 };
}

export function chartGridStroke() {
  return "hsl(var(--border))";
}

export const DASHBOARD_YEARS = ["2024", "2025"] as const;
export type DashboardYear = (typeof DASHBOARD_YEARS)[number];
