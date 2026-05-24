import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("endfield template uses official Endfield yellow", async () => {
  const html = await readFile("styles/endfield-template.css", "utf8");

  assert.match(html, /--endfield-yellow:\s*#fffa00;/);
  assert.doesNotMatch(html, /rgb\(254,\s*250,\s*83\)/);
});

test("endfield template keeps official operator accent colors", async () => {
  const html = await readFile("styles/endfield-template.css", "utf8");

  assert.match(html, /--endfield-magenta:\s*#ff00f0;/);
  assert.match(html, /--endfield-teal:\s*#00ffa2;/);
  assert.doesNotMatch(html, /rgb\(234,\s*51,\s*233\)/);
  assert.doesNotMatch(html, /rgb\(117,\s*251,\s*170\)/);
});

test("endfield template keeps official bracket colors by context", async () => {
  const html = await readFile("styles/endfield-template.css", "utf8");

  assert.match(html, /--endfield-title-bracket:\s*#797979;/);
  assert.match(html, /--endfield-muted:\s*#999;/);
  assert.match(
    html,
    /\.endfield-profile-heading \.__02-Operator_leftBracket__MSSfG,[\s\S]*?\.endfield-profile-heading \.__02-Operator_rightBracket__YpY2O \{[\s\S]*?color:\s*var\(--endfield-title-bracket\);/
  );
  assert.match(
    html,
    /\.endfield-header-deco-slot \.__02-Operator_leftBracket__MSSfG,[\s\S]*?\.endfield-header-deco-slot \.__02-Operator_rightBracket__YpY2O \{[\s\S]*?color:\s*var\(--endfield-muted\);/
  );
});

test("endfield template section title scales as a single official title group", async () => {
  const html = await readFile("styles/endfield-template.css", "utf8");

  assert.match(html, /--endfield-section-title-scale:\s*1\.2;/);
  assert.match(
    html,
    /\.__05-Gameplay_endfieldPre__LUcJv \{[\s\S]*?height:\s*calc\(0\.59mm \* var\(--endfield-section-title-effective-scale\)\);/
  );
  assert.match(
    html,
    /\.endfield-section-title-row \{[\s\S]*?height:\s*calc\(3\.15mm \* var\(--endfield-section-title-effective-scale\)\);/
  );
  assert.match(
    html,
    /\.endfield-section-title-icon \{[\s\S]*?width:\s*calc\(10\.24mm \* var\(--endfield-section-title-effective-scale\)\);/
  );
  assert.match(
    html,
    /\.endfield-section-title-text \{[\s\S]*?font-size:\s*calc\(8\.8pt \* var\(--endfield-section-title-effective-scale\)\);/
  );
});

test("endfield template quantifies its page chrome layout", async () => {
  const html = await readFile("styles/endfield-template.css", "utf8");

  const layoutVariables = [
    "--endfield-page-margin-block: calc(9mm * var(--endfield-density-scale));",
    "--endfield-page-margin-inline: calc(9mm * var(--endfield-density-scale));",
    "--endfield-sidebar-reserve: calc(8mm * var(--endfield-density-scale));",
    "--endfield-content-left: calc(var(--endfield-page-margin-inline) + var(--endfield-sidebar-reserve));",
    "--endfield-photo-column: calc(24mm * var(--endfield-density-scale));",
    "--endfield-profile-gap: calc(4mm * var(--endfield-density-scale));",
    "--endfield-header-top-gap: calc(8mm * var(--endfield-density-scale));",
    "--endfield-sidebar-width: calc(11mm * var(--endfield-chrome-scale));",
    "--endfield-header-deco-unit: 1.275mm;",
    "--endfield-header-deco-top: calc(5.7mm * var(--endfield-density-scale));",
    "--endfield-side-rail-width: var(--endfield-page-margin-inline);",
    "--endfield-corner-deco-width: 2mm;",
    "--endfield-corner-deco-inset: calc(3.5mm * var(--endfield-density-scale));",
  ];

  for (const variable of layoutVariables) {
    assert.match(html, new RegExp(variable.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }

  assert.match(
    html,
    /padding:\s*var\(--endfield-page-margin-block\) var\(--endfield-page-margin-inline\) var\(--endfield-page-margin-block\) var\(--endfield-content-left\);/
  );
  assert.match(
    html,
    /grid-template-columns:\s*var\(--endfield-photo-column\) minmax\(0, 1fr\);/
  );
  assert.match(html, /left:\s*var\(--endfield-content-left\);/);
  assert.match(html, /width:\s*var\(--endfield-side-rail-effective-width\);/);
});

test("endfield template separates flow, density, and chrome scales", async () => {
  const html = await readFile("styles/endfield-template.css", "utf8");

  const scaleVariables = [
    "--endfield-flow-scale: var(--fit-scale);",
    "--endfield-chrome-scale: 1;",
    "--endfield-density-scale: 1;",
    "--endfield-section-title-effective-scale: calc(var(--endfield-flow-scale) * var(--endfield-section-title-scale));",
    "--endfield-side-rail-effective-width: calc(var(--endfield-side-rail-width) * var(--endfield-chrome-scale));",
    "--endfield-header-deco-effective-unit: calc(var(--endfield-header-deco-unit) * var(--endfield-chrome-scale));",
    "--endfield-corner-deco-effective-width: calc(var(--endfield-corner-deco-width) * var(--endfield-chrome-scale));",
  ];

  for (const variable of scaleVariables) {
    assert.match(html, new RegExp(variable.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }

  assert.match(
    html,
    /\.endfield-profile-heading \.__02-Operator_title__Qc2kT \{[\s\S]*?font-size:\s*calc\(20pt \* var\(--endfield-flow-scale\)\);/
  );
  assert.match(
    html,
    /\.endfield-section-title-text \{[\s\S]*?font-size:\s*calc\(8\.8pt \* var\(--endfield-section-title-effective-scale\)\);/
  );
  assert.match(
    html,
    /\.endfield-notice-date \{[\s\S]*?--endfield-notice-u:\s*calc\(var\(--endfield-side-rail-effective-width\) \/ 8\.25\);[\s\S]*?width:\s*var\(--endfield-side-rail-effective-width\);/
  );
  assert.match(
    html,
    /\.endfield-corner-gameplay-deco \{[\s\S]*?width:\s*var\(--endfield-corner-deco-effective-width\);/
  );
});

test("endfield template does not keep legacy template colors", async () => {
  const html = await readFile("styles/endfield-template.css", "utf8");
  const legacyColors = [
    "#111827",
    "#1f2933",
    "#5281f7",
    "#64748b",
    "#8b8f96",
    "#9ca3af",
    "#cbd5e1",
    "#d1d5db",
    "#d7d9db",
    "#e6ebf2",
    "#f3f4f6",
  ];

  for (const color of legacyColors) {
    assert.doesNotMatch(html, new RegExp(color, "i"), `${color} should not appear in template`);
  }
});
