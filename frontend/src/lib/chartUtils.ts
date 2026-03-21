export const CHART_COLORS = {
  accent: "#D97757",
  blue: "#2C84DB",
  emerald: "#059669",
  violet: "#7C3AED",
  rose: "#E11D48",
  amber: "#D97706",
};

export const CHART_COLORS_ARRAY = [
  CHART_COLORS.accent,
  CHART_COLORS.blue,
  CHART_COLORS.emerald,
  CHART_COLORS.violet,
  CHART_COLORS.rose,
  CHART_COLORS.amber,
];

export const AXIS_STYLE = {
  fontSize: 12,
  fill: "#BBB9AF",
};

export const GRID_STROKE = "#C2C0B6";

export function formatCurrency(value: number): string {
  return `$${value.toLocaleString()}`;
}
