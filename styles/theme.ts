export type ThemeMode = "light" | "dark"

export type ThemeColors = {
  background: string
  card: string
  surface: string
  text: string
  muted: string
  border: string
  iconActive: string
  iconInactive: string
}

export function getThemeColors(mode: ThemeMode): ThemeColors {
  const dark = mode === "dark"

  return {
    background: dark ? "#020617" : "#f8fbff",
    card: dark ? "#0f172a" : "#ffffff",
    surface: dark ? "#1e293b" : "#edf2ff",
    text: dark ? "#e2e8f0" : "#0f172a",
    muted: dark ? "#94a3b8" : "#475569",
    border: dark ? "#334155" : "#bfdbfe",
    iconActive: "#16a34a",
    iconInactive: dark ? "#1e293b" : "#d1fae5"
  }
}
