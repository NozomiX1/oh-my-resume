import test from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_TEMPLATE_ID,
  TEMPLATE_CLASS_NAMES,
  applyTemplateEnhancements,
  applyTemplateClass,
  normalizeTemplateId,
  templateLabelForId
} from "../src/templates.js";

class ClassList {
  constructor(classes = []) {
    this.values = new Set(classes);
  }

  add(...classes) {
    for (const className of classes) {
      this.values.add(className);
    }
  }

  remove(...classes) {
    for (const className of classes) {
      this.values.delete(className);
    }
  }

  contains(className) {
    return this.values.has(className);
  }
}

test("normalizes template ids and exposes labels", () => {
  assert.equal(DEFAULT_TEMPLATE_ID, "standard");
  assert.equal(normalizeTemplateId("standard"), "standard");
  assert.equal(normalizeTemplateId("endfield"), "endfield");
  assert.equal(normalizeTemplateId("unknown"), "standard");
  assert.equal(normalizeTemplateId(""), "standard");
  assert.equal(templateLabelForId("standard"), "Compact Technical");
  assert.equal(templateLabelForId("endfield"), "Endfield");
});

test("applies exactly one template class without removing other page classes", () => {
  const element = {
    classList: new ClassList(["resume-page", "density-tight", ...TEMPLATE_CLASS_NAMES])
  };

  applyTemplateClass(element, "endfield");

  assert.equal(element.classList.contains("resume-page"), true);
  assert.equal(element.classList.contains("density-tight"), true);
  assert.equal(element.classList.contains("template-standard"), false);
  assert.equal(element.classList.contains("template-endfield"), true);
});

test("applies Endfield template enhancements only for the Endfield template", () => {
  const inserted = [];
  const element = {
    insertAdjacentHTML: (position, html) => {
      inserted.push({ position, html });
    }
  };

  applyTemplateEnhancements(element, "standard");

  assert.equal(inserted.length, 0);

  applyTemplateEnhancements(element, "endfield");

  const html = inserted.map((entry) => entry.html).join("\n");
  assert.match(html, /endfield-operator-bg/);
  assert.match(html, /endfield-sidebar/);
  assert.match(html, /endfield-header-deco-slot/);
  assert.match(html, /endfield-notice-date/);
  assert.match(html, /endfield-corner-gameplay-deco/);
  assert.match(html, /viewBox="0 0 214 233"/);
  assert.match(html, /M95\.1 95\.5V115L63\.5 92\.7/);
  assert.match(html, /CANDIDATE-01/);
  assert.match(html, /01 \/ --/);
  assert.doesNotMatch(html, /<text[^>]*>终<\/text>/);
});
