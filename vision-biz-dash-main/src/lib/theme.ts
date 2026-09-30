export type ThemeId = "violet" | "slate" | "teal";

export const THEME_STORAGE_KEY = "vi-theme";

export const THEME_OPTIONS: { id: ThemeId; label: string; hint: string }[] = [
  { id: "violet", label: "紫晶", hint: "默认" },
  { id: "slate", label: "石板", hint: "冷静专业" },
  { id: "teal", label: "青绿", hint: "清爽经营" },
];

export function readStoredTheme(): ThemeId {
  try {
    const value = localStorage.getItem(THEME_STORAGE_KEY);
    if (value === "violet" || value === "slate" || value === "teal") return value;
  } catch {
    // ignore
  }
  return "violet";
}

export function applyTheme(theme: ThemeId) {
  document.documentElement.setAttribute("data-theme", theme);
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // ignore
  }
}

export function initTheme() {
  applyTheme(readStoredTheme());
}
