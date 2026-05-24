import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("static scaffold files include required shell hooks", async () => {
  const [gitignore, readme, packageJson, html, appCss, templateCss, endfieldCss, appJs, templatesJs, endfieldTemplateJs, exampleJs] = await Promise.all([
    readFile(".gitignore", "utf8"),
    readFile("README.md", "utf8"),
    readFile("package.json", "utf8"),
    readFile("index.html", "utf8"),
    readFile("styles/app.css", "utf8"),
    readFile("styles/compact-technical.css", "utf8"),
    readFile("styles/endfield-template.css", "utf8"),
    readFile("src/app.js", "utf8"),
    readFile("src/templates.js", "utf8"),
    readFile("src/endfieldTemplate.js", "utf8"),
    readFile("src/example.js", "utf8")
  ]);
  const pkg = JSON.parse(packageJson);

  assert.equal(pkg.name, "oh-my-resume");
  assert.equal(pkg.scripts.test, "node --test tests/*.test.mjs");
  assert.equal(pkg.scripts.serve, "python3 -m http.server 4173");
  assert.match(readme, /^# Oh My Resume$/m);
  assert.match(readme, /npm run serve/);
  assert.match(readme, /Open <http:\/\/localhost:4173>\./);
  assert.match(readme, /npm test/);
  assert.match(readme, /Click `Print \/ Save PDF`, then choose `Save as PDF` in the system print dialog\./);
  assert.match(readme, /Chrome is recommended for PDF export/);
  assert.match(readme, /Background graphics/);
  assert.match(readme, /This project has no build step\./);
  assert.match(gitignore, /^\.superpowers\/$/m);
  assert.match(gitignore, /^node_modules\/$/m);
  assert.match(gitignore, /^coverage\/$/m);
  assert.match(html, /<link rel="stylesheet" href="\.\/styles\/app\.css\?v=\d{8,}">/);
  assert.match(html, /<link rel="stylesheet" href="\.\/styles\/compact-technical\.css\?v=\d{8,}">/);
  assert.match(html, /<link rel="stylesheet" href="\.\/styles\/endfield-template\.css\?v=\d{8,}">/);
  assert.match(html, /id="templatePill"/);
  assert.match(html, /id="templateStandardButton"/);
  assert.match(html, /id="templateEndfieldButton"/);
  assert.match(html, /<textarea id="editor"/);
  assert.match(html, /<article id="resumePage" class="resume-page template-standard density-normal"/);
  assert.match(html, /id="photoInput"/);
  assert.match(html, /id="removePhotoButton"/);
  assert.match(html, /id="accentColorInput"[^>]*value="#5281F7"/);
  assert.match(html, /id="fitButton"/);
  assert.match(html, /id="resetButton"/);
  assert.match(html, /id="printButton"/);
  assert.match(html, /<title>Oh My Resume<\/title>/);
  assert.match(html, /<span class="app-name">Oh My Resume<\/span>/);
  assert.match(appCss, /\.workspace\s*\{/);
  assert.match(appCss, /\.editor-pane/);
  assert.match(appCss, /\.preview-pane/);
  assert.match(appCss, /\.file-button:focus-within/);
  assert.match(appCss, /@media print/);
  assert.match(templateCss, /@page\s*\{/);
  assert.match(templateCss, /size: A4/);
  assert.match(templateCss, /width: 210mm/);
  assert.match(templateCss, /\.resume-page\s*\{[^}]*height: 297mm/s);
  assert.doesNotMatch(templateCss, /\.resume-page\s*\{[^}]*min-height: 297mm/s);
  assert.match(templateCss, /overflow: visible/);
  assert.match(templateCss, /\.resume-header\s*\{[^}]*align-items: center/s);
  assert.match(templateCss, /\.resume-header\s*\{[^}]*grid-template-columns: 24mm minmax\(0, 1fr\) 24mm/s);
  assert.match(templateCss, /\.resume-profile\s*\{[^}]*grid-column: 2/s);
  assert.match(templateCss, /\.resume-profile\s*\{[^}]*grid-row: 1/s);
  assert.doesNotMatch(templateCss, /\.resume-profile\s*\{[^}]*grid-column: 1/s);
  assert.match(templateCss, /\.resume-header \.resume-photo\s*\{[^}]*grid-column: 3/s);
  assert.match(templateCss, /\.resume-header \.resume-photo\s*\{[^}]*grid-row: 1/s);
  assert.match(templateCss, /--accent-color:\s*#5281F7/);
  assert.match(templateCss, /--muted-color:\s*#374151/);
  assert.match(templateCss, /\.resume-section h2\s*\{[^}]*color: var\(--accent-color\)/s);
  assert.match(templateCss, /\.resume-section h2\s*\{[^}]*border-bottom: 1\.2pt solid var\(--accent-color\)/s);
  assert.match(templateCss, /\.resume-section h2::after\s*\{[^}]*content: none/s);
  assert.match(templateCss, /\.resume-contacts\s*\{[^}]*gap:\s*1pt 12pt/s);
  assert.match(templateCss, /\.resume-contacts \.contact\s*\{[^}]*position:\s*relative/s);
  assert.match(templateCss, /\.resume-contacts \.contact:not\(\.contact-row-start\)::before\s*\{[^}]*content:\s*"\|"/s);
  assert.match(templateCss, /\.resume-contacts \.contact:not\(\.contact-row-start\)::before\s*\{[^}]*position:\s*absolute/s);
  assert.match(templateCss, /\.resume-contacts \.contact:not\(\.contact-row-start\)::before\s*\{[^}]*color:\s*var\(--muted-color\)/s);
  assert.doesNotMatch(templateCss, /contact-separator/);
  assert.doesNotMatch(templateCss, /\.resume-section-skills p/);
  assert.doesNotMatch(templateCss, /\.resume-section-skills li\s*\{/);
  assert.doesNotMatch(templateCss, /\.resume-section-skills ul\s*\{[^}]*display:\s*flex/s);
  assert.doesNotMatch(templateCss, /\.resume-section-skills ul\s*\{[^}]*flex-wrap:/s);
  assert.match(endfieldCss, /\.resume-page\.template-endfield\s*\{/);
  assert.match(endfieldCss, /--endfield-template-ready:\s*1/);
  assert.match(endfieldCss, /endfield-operator-bg/);
  assert.match(endfieldCss, /endfield-profile-heading/);
  assert.match(endfieldCss, /\.resume-page\.template-endfield \.endfield-profile-tags::before\s*\{/);
  assert.match(endfieldCss, /\.resume-page\.template-endfield \.endfield-bg-hollow\s*\{[^}]*color:\s*#e1e1e1/s);
  assert.match(endfieldCss, /\.resume-page\.template-endfield \.endfield-bg-hollow\s*\{[^}]*background-image:\s*none/s);
  assert.doesNotMatch(endfieldCss, /\.resume-page\.template-endfield \.endfield-bg-hollow\s*\{[^}]*background-clip/s);
  assert.match(endfieldCss, /\.resume-page\.template-endfield \.endfield-bg-deco::before\s*\{[^}]*endfield-wave-bg\.png/s);
  assert.match(endfieldCss, /\.resume-page\.template-endfield \.endfield-bg-deco-line\s*\{/);
  assert.match(endfieldCss, /\.resume-page\.template-endfield \.endfield-bg-shallow\s*\{[^}]*display:\s*none/s);
  assert.match(endfieldCss, /\.resume-page\.template-endfield \.endfield-bg-tape\s*\{[^}]*display:\s*none/s);
  assert.match(endfieldCss, /\.resume-page\.template-endfield \.endfield-bg-flag\s*\{[^}]*display:\s*none/s);
  assert.match(endfieldCss, /\.resume-page\.template-endfield \.endfield-bg-plus\s*\{[^}]*display:\s*none/s);
  assert.doesNotMatch(endfieldCss, /\.resume-page\.template-endfield \.resume-title::after\s*\{/);
  assert.doesNotMatch(endfieldCss, /mockups\/assets/);
  assert.match(endfieldCss, /\.\.\/assets\/endfield\/prof-assault\.jpg/);
  assert.match(endfieldCss, /\.\.\/assets\/endfield\/left-deco-text\.png/);
  assert.match(appJs, /requiredElement/);
  assert.match(appJs, /applyTemplateClass/);
  assert.match(appJs, /applyTemplateEnhancements/);
  assert.match(templatesJs, /applyTemplateEnhancements/);
  assert.match(endfieldTemplateJs, /applyEndfieldTemplate/);
  assert.match(endfieldTemplateJs, /endfield-sidebar/);
  assert.match(endfieldTemplateJs, /endfield-operator-bg/);
  assert.match(endfieldTemplateJs, /viewBox="0 0 214 233"/);
  assert.match(endfieldTemplateJs, /M95\.1 95\.5V115L63\.5 92\.7/);
  assert.match(endfieldTemplateJs, /viewBox="0 0 122 6" class="SectionTitle_icon__YpILA"/);
  assert.doesNotMatch(endfieldTemplateJs, /<text[^>]*>终<\/text>/);
  assert.match(html, /<script type="module" src="\.\/src\/app\.js\?v=\d{8,}"><\/script>/);
  assert.match(appJs, /window\.print\(\)/);
  assert.match(exampleJs, /丰川祥子/);
  assert.doesNotMatch(exampleJs, /照片：/);
});
