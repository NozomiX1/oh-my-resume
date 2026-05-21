const DENSITY_CLASSES = ["density-normal", "density-tight", "density-ultra"];
const MAX_DENSITY_LEVEL = DENSITY_CLASSES.length - 1;
const MIN_FIT_SCALE = 0.88;

function normalizedDensityLevel(level) {
  const numericLevel = Number.isFinite(level) ? Math.trunc(level) : 0;
  return Math.min(Math.max(numericLevel, 0), MAX_DENSITY_LEVEL);
}

export function densityClassForLevel(level) {
  return DENSITY_CLASSES[normalizedDensityLevel(level)];
}

export function nextDensityLevel(level) {
  return Math.min(normalizedDensityLevel(level) + 1, MAX_DENSITY_LEVEL);
}

export function normalizeFitScale(scale) {
  const numericScale = Number(scale);

  if (!Number.isFinite(numericScale)) {
    return 1;
  }

  return Math.min(Math.max(numericScale, MIN_FIT_SCALE), 1);
}

export function getOverflowRatio(contentHeight, pageHeight) {
  if (
    !Number.isFinite(contentHeight) ||
    !Number.isFinite(pageHeight) ||
    pageHeight <= 0 ||
    contentHeight <= pageHeight
  ) {
    return 0;
  }

  return (contentHeight - pageHeight) / pageHeight;
}

export function applyDensityClass(element, level) {
  element.classList.remove(...DENSITY_CLASSES);
  element.classList.add(densityClassForLevel(level));
}

export function applyFitScale(element, scale) {
  element.style.setProperty("--fit-scale", normalizeFitScale(scale).toFixed(3));
}
