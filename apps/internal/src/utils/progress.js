export const parseProgressValue = (value) => {
  if (value === null || value === undefined || value === "" || value === "---") {
    return null;
  }
  const numeric = Number(String(value).replace("%", "").trim());
  if (Number.isNaN(numeric)) return null;
  return Math.min(100, Math.max(0, numeric));
};

export const getProgressBarColor = (percent) => {
  if (percent >= 100) return "var(--color-icon-green)";
  if (percent >= 60) return "var(--color-blue-8)";
  if (percent >= 40) return "var(--color-orange-background)";
  return "var(--color-light-red-3)";
};
