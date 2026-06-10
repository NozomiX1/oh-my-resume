import { exampleMarkdown } from "./example.js?v=20260522";
import { parseResumeMarkdown } from "./parser.js?v=20260522";
import { renderResumeHtml } from "./render.js?v=20260522";
import { applyDensityClass, applyFitScale, getContentBoxOverflowRatio, getOverflowRatio } from "./fit.js?v=2026061001";
import { markContactRowStarts } from "./contactRows.js?v=20260522";
import {
  DEFAULT_TEMPLATE_ID,
  applyTemplateEnhancements,
  applyTemplateClass,
  normalizeTemplateId,
  templateLabelForId
} from "./templates.js?v=20260523";

const DEFAULT_ACCENT_COLOR = "#5281f7";

function requiredElement(selector) {
  const element = document.querySelector(selector);

  if (!element) {
    throw new Error(`Missing required app element: ${selector}`);
  }

  return element;
}

const editor = requiredElement("#editor");
const resumePage = requiredElement("#resumePage");
const warnings = requiredElement("#warnings");
const statusLine = requiredElement("#statusLine");
const photoInput = requiredElement("#photoInput");
const removePhotoButton = requiredElement("#removePhotoButton");
const accentColorInput = requiredElement("#accentColorInput");
const templateStandardButton = requiredElement("#templateStandardButton");
const templateEndfieldButton = requiredElement("#templateEndfieldButton");
const templatePill = requiredElement("#templatePill");
const fitButton = requiredElement("#fitButton");
const resetButton = requiredElement("#resetButton");
const printButton = requiredElement("#printButton");

let uploadedPhotoUrl = "";
let densityLevel = 0;
let fitScale = 1;
let currentTemplateId = DEFAULT_TEMPLATE_ID;

editor.value = exampleMarkdown;
accentColorInput.value = normalizeAccentColor(accentColorInput.value);
applyAccentColor();
syncTemplateControls();
syncPhotoControls();

editor.addEventListener("input", () => {
  densityLevel = 0;
  fitScale = 1;
  render();
});

photoInput.addEventListener("change", () => {
  const file = photoInput.files?.[0];

  if (!file) {
    return;
  }

  if (!file.type.startsWith("image/")) {
    renderWarnings(["请选择图片文件作为照片。"]);
    photoInput.value = "";
    return;
  }

  if (uploadedPhotoUrl) {
    URL.revokeObjectURL(uploadedPhotoUrl);
  }

  uploadedPhotoUrl = URL.createObjectURL(file);
  syncPhotoControls();
  render();
});

removePhotoButton.addEventListener("click", () => {
  clearUploadedPhoto();
  render();
});

accentColorInput.addEventListener("input", () => {
  applyAccentColor();
});

templateStandardButton.addEventListener("click", () => {
  selectTemplate("standard");
});

templateEndfieldButton.addEventListener("click", () => {
  selectTemplate("endfield");
});

fitButton.addEventListener("click", () => {
  void fitOnePage();
});

resetButton.addEventListener("click", () => {
  editor.value = exampleMarkdown;
  densityLevel = 0;
  fitScale = 1;
  clearUploadedPhoto();
  render();
});

printButton.addEventListener("click", () => {
  render();
  window.print();
});

function render({ updateStatus = true } = {}) {
  const doc = parseResumeMarkdown(editor.value);

  if (uploadedPhotoUrl) {
    doc.uploadedPhoto = uploadedPhotoUrl;
  }

  resumePage.innerHTML = renderResumeHtml(doc);
  applyTemplateClass(resumePage, currentTemplateId);
  applyDensityClass(resumePage, densityLevel);
  applyFitScale(resumePage, fitScale);
  markContactRowStarts(resumePage);
  applyTemplateEnhancements(resumePage, currentTemplateId);
  syncTemplateControls();
  renderWarnings(doc.warnings);

  if (updateStatus) {
    requestAnimationFrame(() => {
      updateOverflowStatus();
    });
  }
}

function renderWarnings(messages) {
  const warningElements = messages.map((message) => {
    const warning = document.createElement("div");
    warning.textContent = message;
    return warning;
  });

  warnings.replaceChildren(...warningElements);
}

function updateOverflowStatus() {
  const ratio = getCurrentOverflowRatio();

  if (ratio === 0) {
    statusLine.textContent = `A4 preview · fits one page · ${densityLabel()}`;
    return;
  }

  statusLine.textContent = `A4 preview · over by ${Math.ceil(ratio * 100)}% · ${densityLabel()}`;
}

async function fitOnePage() {
  render({ updateStatus: false });
  let foundFit = false;

  for (let level = 0; level <= 2; level += 1) {
    const scale = await findLargestFittingScale(level);

    if (scale !== null) {
      densityLevel = level;
      fitScale = scale;
      applyDensityClass(resumePage, densityLevel);
      applyFitScale(resumePage, fitScale);
      markContactRowStarts(resumePage);
      foundFit = true;
      break;
    }
  }

  if (!foundFit) {
    densityLevel = 2;
    fitScale = 0.88;
    applyDensityClass(resumePage, densityLevel);
    applyFitScale(resumePage, fitScale);
    markContactRowStarts(resumePage);
    await nextFrame();
  }

  updateOverflowStatus();
}

async function findLargestFittingScale(level) {
  applyDensityClass(resumePage, level);
  applyFitScale(resumePage, 1);
  markContactRowStarts(resumePage);
  await nextFrame();

  if (getCurrentOverflowRatio() === 0) {
    return 1;
  }

  let low = 0.88;
  let high = 1;

  applyFitScale(resumePage, low);
  markContactRowStarts(resumePage);
  await nextFrame();

  if (getCurrentOverflowRatio() > 0) {
    return null;
  }

  for (let index = 0; index < 8; index += 1) {
    const mid = (low + high) / 2;
    applyFitScale(resumePage, mid);
    markContactRowStarts(resumePage);
    await nextFrame();

    if (getCurrentOverflowRatio() === 0) {
      low = mid;
    } else {
      high = mid;
    }
  }

  return low;
}

function getCurrentOverflowRatio() {
  const visualRatio = getCurrentVisualOverflowRatio();
  const scrollRatio = getOverflowRatio(resumePage.scrollHeight, resumePage.clientHeight);

  if (visualRatio === null) {
    return scrollRatio;
  }

  return Math.max(visualRatio, scrollRatio);
}

function getCurrentVisualOverflowRatio() {
  const pageRect = rectForElement(resumePage);

  if (!pageRect || typeof getComputedStyle !== "function") {
    return null;
  }

  const contentBottom = getFlowContentBottom(resumePage, pageRect.top);

  if (contentBottom === null) {
    return null;
  }

  return getContentBoxOverflowRatio(
    contentBottom,
    pageRect.height,
    parseCssPixels(getComputedStyle(resumePage).paddingBottom)
  );
}

function getFlowContentBottom(root, rootTop) {
  let bottom = null;

  for (const child of Array.from(root.children ?? [])) {
    if (isOutOfFlow(child)) {
      continue;
    }

    const rect = rectForElement(child);

    if (!rect || (rect.width <= 0 && rect.height <= 0)) {
      continue;
    }

    bottom = Math.max(bottom ?? rect.bottom, rect.bottom);
  }

  return bottom === null ? null : bottom - rootTop;
}

function isOutOfFlow(element) {
  const style = typeof getComputedStyle === "function" ? getComputedStyle(element) : null;

  return style?.display === "none" || style?.position === "absolute" || style?.position === "fixed";
}

function rectForElement(element) {
  if (typeof element?.getBoundingClientRect !== "function") {
    return null;
  }

  const rect = element.getBoundingClientRect();

  if (
    !Number.isFinite(rect?.top) ||
    !Number.isFinite(rect?.bottom) ||
    !Number.isFinite(rect?.height)
  ) {
    return null;
  }

  return rect;
}

function parseCssPixels(value) {
  const pixels = Number.parseFloat(value);

  return Number.isFinite(pixels) ? pixels : 0;
}

function applyAccentColor() {
  resumePage.style.setProperty("--accent-color", normalizeAccentColor(accentColorInput.value));
}

function selectTemplate(templateId) {
  const nextTemplateId = normalizeTemplateId(templateId);

  if (nextTemplateId === currentTemplateId) {
    return;
  }

  currentTemplateId = nextTemplateId;
  render();
}

function syncTemplateControls() {
  const isStandard = currentTemplateId === "standard";
  const isEndfield = currentTemplateId === "endfield";

  templatePill.textContent = templateLabelForId(currentTemplateId);
  setSegmentState(templateStandardButton, isStandard);
  setSegmentState(templateEndfieldButton, isEndfield);
}

function setSegmentState(button, isActive) {
  button.classList.toggle?.("is-active", isActive);

  if (!button.classList.toggle) {
    if (isActive) {
      button.classList.add("is-active");
    } else {
      button.classList.remove("is-active");
    }
  }

  button.setAttribute?.("aria-pressed", String(isActive));
}

function normalizeAccentColor(value) {
  return /^#[\da-f]{6}$/i.test(value) ? value.toLowerCase() : DEFAULT_ACCENT_COLOR;
}

function nextFrame() {
  return new Promise((resolve) => {
    requestAnimationFrame(resolve);
  });
}

function densityLabel() {
  if (densityLevel === 0) {
    return "normal";
  }

  if (densityLevel === 1) {
    return "tight";
  }

  return "ultra";
}

function clearUploadedPhoto() {
  if (uploadedPhotoUrl) {
    URL.revokeObjectURL(uploadedPhotoUrl);
    uploadedPhotoUrl = "";
  }

  photoInput.value = "";
  syncPhotoControls();
}

function syncPhotoControls() {
  removePhotoButton.disabled = !uploadedPhotoUrl;
}

render();
