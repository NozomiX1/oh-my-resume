import { applyEndfieldTemplate } from "./endfieldTemplate.js?v=20260523";

export const DEFAULT_TEMPLATE_ID = "standard";

export const TEMPLATES = [
  {
    id: "standard",
    label: "Compact Technical",
    className: "template-standard"
  },
  {
    id: "endfield",
    label: "Endfield",
    className: "template-endfield"
  }
];

export const TEMPLATE_CLASS_NAMES = TEMPLATES.map((template) => template.className);

export function normalizeTemplateId(templateId) {
  return TEMPLATES.some((template) => template.id === templateId) ? templateId : DEFAULT_TEMPLATE_ID;
}

export function templateLabelForId(templateId) {
  return templateForId(templateId).label;
}

export function applyTemplateClass(element, templateId) {
  const template = templateForId(templateId);

  element.classList.remove(...TEMPLATE_CLASS_NAMES);
  element.classList.add(template.className);
}

export function applyTemplateEnhancements(element, templateId) {
  if (normalizeTemplateId(templateId) !== "endfield") {
    return;
  }

  applyEndfieldTemplate(element);
}

function templateForId(templateId) {
  const normalizedId = normalizeTemplateId(templateId);
  return TEMPLATES.find((template) => template.id === normalizedId) ?? TEMPLATES[0];
}
