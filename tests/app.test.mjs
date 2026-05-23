import test from "node:test";
import assert from "node:assert/strict";

class TestElement {
  constructor({ files = [] } = {}) {
    this.value = "";
    this.innerHTML = "";
    this.textContent = "";
    this.files = files;
    this.children = [];
    this.listeners = new Map();
    this.classList = {
      values: new Set(),
      add: (...classes) => {
        for (const className of classes) {
          this.classList.values.add(className);
        }
      },
      remove: (...classes) => {
        for (const className of classes) {
          this.classList.values.delete(className);
        }
      },
      contains: (className) => this.classList.values.has(className)
    };
  }

  addEventListener(type, listener) {
    this.listeners.set(type, listener);
  }

  dispatch(type) {
    return this.listeners.get(type)?.({ target: this });
  }

  replaceChildren(...children) {
    this.children = children;
    this.innerHTML = "";
    this.textContent = children.map((child) => child.textContent).join("");
  }

  insertAdjacentHTML(position, html) {
    if (position === "afterbegin") {
      this.innerHTML = `${html}${this.innerHTML}`;
      return;
    }

    this.innerHTML = `${this.innerHTML}${html}`;
  }
}

function heightForDensity(resumePage, heightsByDensity) {
  const fitScale = Number(resumePage.style?.getPropertyValue("--fit-scale")) || 1;
  const scaled = (height) => height * fitScale;

  if (resumePage.classList.contains("density-ultra")) {
    return scaled(heightsByDensity.ultra);
  }

  if (resumePage.classList.contains("density-tight")) {
    return scaled(heightsByDensity.tight);
  }

  return scaled(heightsByDensity.normal);
}

async function drainAnimationFrames(count = 4) {
  for (let index = 0; index < count; index += 1) {
    await Promise.resolve();
  }
}

function createHarness({ heightsByDensity = { normal: 125, tight: 100, ultra: 90 } } = {}) {
  const elements = {
    "#editor": new TestElement(),
    "#resumePage": new TestElement(),
    "#warnings": new TestElement(),
    "#statusLine": new TestElement(),
    "#photoInput": new TestElement(),
    "#removePhotoButton": new TestElement(),
    "#accentColorInput": new TestElement(),
    "#templateStandardButton": new TestElement(),
    "#templateEndfieldButton": new TestElement(),
    "#templatePill": new TestElement(),
    "#fitButton": new TestElement(),
    "#resetButton": new TestElement(),
    "#printButton": new TestElement()
  };
  let printed = false;
  let objectUrlIndex = 0;
  const revokedUrls = [];
  const createdObjects = [];

  elements["#resumePage"].classList.add("resume-page", "density-normal");
  elements["#resumePage"].style = {
    values: new Map(),
    setProperty: (name, value) => {
      elements["#resumePage"].style.values.set(name, value);
    },
    getPropertyValue: (name) => elements["#resumePage"].style.values.get(name) ?? ""
  };

  Object.defineProperties(elements["#resumePage"], {
    clientHeight: { value: 100, configurable: true },
    scrollHeight: {
      configurable: true,
      get() {
        return heightForDensity(elements["#resumePage"], heightsByDensity);
      }
    }
  });

  globalThis.document = {
    querySelector: (selector) => elements[selector] ?? null,
    createElement: () => new TestElement()
  };
  globalThis.window = {
    print: () => {
      printed = true;
    }
  };
  globalThis.requestAnimationFrame = (callback) => {
    callback();
  };
  globalThis.URL.createObjectURL = (object) => {
    createdObjects.push(object);
    objectUrlIndex += 1;
    return `blob:test-${objectUrlIndex}`;
  };
  globalThis.URL.revokeObjectURL = (url) => {
    revokedUrls.push(url);
  };

  return {
    elements,
    createdObjects,
    printed: () => printed,
    revokedUrls
  };
}

async function loadApp() {
  const url = new URL("../src/app.js", import.meta.url);
  url.searchParams.set("cacheBust", String(Math.random()));
  await import(url.href);
}

test("wires editor, rendering, density, photo, reset, and print controls", async () => {
  const harness = createHarness();
  const editor = harness.elements["#editor"];
  const resumePage = harness.elements["#resumePage"];
  const warnings = harness.elements["#warnings"];
  const statusLine = harness.elements["#statusLine"];
  const photoInput = harness.elements["#photoInput"];
  const removePhotoButton = harness.elements["#removePhotoButton"];
  const accentColorInput = harness.elements["#accentColorInput"];
  const templatePill = harness.elements["#templatePill"];
  const fitButton = harness.elements["#fitButton"];
  const resetButton = harness.elements["#resetButton"];
  const printButton = harness.elements["#printButton"];

  await loadApp();

  assert.match(editor.value, /# 丰川祥子/);
  assert.match(resumePage.innerHTML, /丰川祥子/);
  assert.equal((resumePage.innerHTML.match(/class="[^"]*\bresume-page\b/g) ?? []).length, 0);
  assert.equal(resumePage.classList.contains("resume-page"), true);
  assert.equal(resumePage.classList.contains("template-standard"), true);
  assert.equal(resumePage.classList.contains("template-endfield"), false);
  assert.equal(templatePill.textContent, "Compact Technical");
  assert.equal(accentColorInput.value, "#5281f7");
  assert.equal(resumePage.style.getPropertyValue("--accent-color"), "#5281f7");
  assert.equal(warnings.children.length, 0);
  assert.equal(removePhotoButton.disabled, true);
  assert.equal(statusLine.textContent, "A4 preview · over by 25% · normal");

  accentColorInput.value = "#1d4ed8";
  accentColorInput.dispatch("input");

  assert.equal(resumePage.style.getPropertyValue("--accent-color"), "#1d4ed8");

  fitButton.dispatch("click");
  await drainAnimationFrames(40);

  assert.equal(statusLine.textContent, "A4 preview · fits one page · tight");
  assert.equal(resumePage.classList.contains("density-tight"), true);
  assert.equal(resumePage.classList.contains("template-standard"), true);
  assert.equal((resumePage.innerHTML.match(/\bdensity-/g) ?? []).length, 0);

  photoInput.files = [{ name: "avatar.png", type: "image/png" }];
  photoInput.dispatch("change");

  assert.match(resumePage.innerHTML, /src="blob:test-1"/);
  assert.equal(removePhotoButton.disabled, false);

  photoInput.files = [{ name: "avatar-2.png", type: "image/png" }];
  photoInput.dispatch("change");

  assert.deepEqual(harness.revokedUrls, ["blob:test-1"]);
  assert.match(resumePage.innerHTML, /src="blob:test-2"/);

  removePhotoButton.dispatch("click");

  assert.equal(photoInput.value, "");
  assert.equal(removePhotoButton.disabled, true);
  assert.equal(harness.revokedUrls.at(-1), "blob:test-2");
  assert.doesNotMatch(resumePage.innerHTML, /resume-photo/);

  editor.value = "Plain text without a name";
  editor.dispatch("input");

  assert.equal(warnings.children.length, 1);
  assert.match(warnings.children[0].textContent, /未识别到姓名/);
  assert.equal(statusLine.textContent, "A4 preview · over by 25% · normal");

  photoInput.value = "selected";
  resetButton.dispatch("click");

  assert.match(editor.value, /# 丰川祥子/);
  assert.equal(photoInput.value, "");
  assert.equal(statusLine.textContent, "A4 preview · over by 25% · normal");

  printButton.dispatch("click");

  assert.equal(harness.printed(), true);
});

test("switches templates without dropping density or fit state", async () => {
  const harness = createHarness({ heightsByDensity: { normal: 125, tight: 100, ultra: 90 } });
  const resumePage = harness.elements["#resumePage"];
  const statusLine = harness.elements["#statusLine"];
  const templatePill = harness.elements["#templatePill"];
  const standardButton = harness.elements["#templateStandardButton"];
  const endfieldButton = harness.elements["#templateEndfieldButton"];
  const fitButton = harness.elements["#fitButton"];

  await loadApp();

  fitButton.dispatch("click");
  await drainAnimationFrames(40);

  assert.equal(resumePage.classList.contains("density-tight"), true);
  assert.equal(statusLine.textContent, "A4 preview · fits one page · tight");

  endfieldButton.dispatch("click");

  assert.equal(resumePage.classList.contains("template-standard"), false);
  assert.equal(resumePage.classList.contains("template-endfield"), true);
  assert.equal(resumePage.classList.contains("density-tight"), true);
  assert.equal(templatePill.textContent, "Endfield");
  assert.equal(endfieldButton.classList.contains("is-active"), true);
  assert.equal(standardButton.classList.contains("is-active"), false);
  assert.match(resumePage.innerHTML, /endfield-operator-bg/);
  assert.match(resumePage.innerHTML, /endfield-sidebar/);
  assert.match(resumePage.innerHTML, /endfield-notice-date/);

  standardButton.dispatch("click");

  assert.equal(resumePage.classList.contains("template-standard"), true);
  assert.equal(resumePage.classList.contains("template-endfield"), false);
  assert.equal(resumePage.classList.contains("density-tight"), true);
  assert.equal(templatePill.textContent, "Compact Technical");
});

test("fit button stops at tight when normal overflows and tight fits", async () => {
  const harness = createHarness({ heightsByDensity: { normal: 125, tight: 100, ultra: 90 } });
  const resumePage = harness.elements["#resumePage"];
  const statusLine = harness.elements["#statusLine"];
  const fitButton = harness.elements["#fitButton"];

  await loadApp();

  assert.equal(statusLine.textContent, "A4 preview · over by 25% · normal");

  fitButton.dispatch("click");
  await drainAnimationFrames(40);

  assert.equal(resumePage.classList.contains("density-tight"), true);
  assert.equal(resumePage.classList.contains("density-ultra"), false);
  assert.equal(statusLine.textContent, "A4 preview · fits one page · tight");
});

test("fit button shrinks normal density before jumping to tighter density", async () => {
  const harness = createHarness({ heightsByDensity: { normal: 104, tight: 82, ultra: 70 } });
  const resumePage = harness.elements["#resumePage"];
  const statusLine = harness.elements["#statusLine"];
  const fitButton = harness.elements["#fitButton"];

  await loadApp();

  assert.equal(statusLine.textContent, "A4 preview · over by 4% · normal");

  fitButton.dispatch("click");
  await drainAnimationFrames(30);

  const fitScale = Number(resumePage.style.getPropertyValue("--fit-scale"));

  assert.equal(resumePage.classList.contains("density-normal"), true);
  assert.equal(resumePage.classList.contains("density-tight"), false);
  assert.equal(resumePage.classList.contains("density-ultra"), false);
  assert.equal(fitScale < 1, true);
  assert.equal(fitScale > 0.94, true);
  assert.equal(statusLine.textContent, "A4 preview · fits one page · normal");
});

test("fit button chooses the least compressed fitting density", async () => {
  const harness = createHarness({ heightsByDensity: { normal: 80, tight: 68, ultra: 56 } });
  const resumePage = harness.elements["#resumePage"];
  const statusLine = harness.elements["#statusLine"];
  const fitButton = harness.elements["#fitButton"];

  await loadApp();

  assert.equal(statusLine.textContent, "A4 preview · fits one page · normal");

  fitButton.dispatch("click");
  await drainAnimationFrames(40);

  assert.equal(resumePage.classList.contains("density-normal"), true);
  assert.equal(resumePage.classList.contains("density-tight"), false);
  assert.equal(resumePage.classList.contains("density-ultra"), false);
  assert.equal(statusLine.textContent, "A4 preview · fits one page · normal");
});

test("fit button continues to ultra when tight still overflows", async () => {
  const harness = createHarness({ heightsByDensity: { normal: 140, tight: 115, ultra: 100 } });
  const resumePage = harness.elements["#resumePage"];
  const statusLine = harness.elements["#statusLine"];
  const fitButton = harness.elements["#fitButton"];

  await loadApp();

  assert.equal(statusLine.textContent, "A4 preview · over by 40% · normal");

  fitButton.dispatch("click");
  await drainAnimationFrames(40);

  assert.equal(resumePage.classList.contains("density-ultra"), true);
  assert.equal(statusLine.textContent, "A4 preview · fits one page · ultra");
});

test("fit button reports overflow at ultra when no density fits", async () => {
  const harness = createHarness({ heightsByDensity: { normal: 170, tight: 140, ultra: 115 } });
  const resumePage = harness.elements["#resumePage"];
  const statusLine = harness.elements["#statusLine"];
  const fitButton = harness.elements["#fitButton"];

  await loadApp();

  assert.equal(statusLine.textContent, "A4 preview · over by 70% · normal");

  fitButton.dispatch("click");
  await drainAnimationFrames(40);

  assert.equal(resumePage.classList.contains("density-ultra"), true);
  assert.equal(statusLine.textContent, "A4 preview · over by 2% · ultra");
});

test("rejects non-image photo uploads without replacing the current preview", async () => {
  const harness = createHarness();
  const resumePage = harness.elements["#resumePage"];
  const warnings = harness.elements["#warnings"];
  const photoInput = harness.elements["#photoInput"];

  await loadApp();

  photoInput.files = [{ name: "avatar.png", type: "image/png" }];
  photoInput.dispatch("change");

  const previousPreview = resumePage.innerHTML;
  const createdBeforeInvalidSelection = harness.createdObjects.length;
  const revokedBeforeInvalidSelection = harness.revokedUrls.length;
  photoInput.value = "selected";
  photoInput.files = [{ name: "notes.txt", type: "text/plain" }];
  photoInput.dispatch("change");

  assert.equal(harness.createdObjects.length, createdBeforeInvalidSelection);
  assert.equal(harness.revokedUrls.length, revokedBeforeInvalidSelection);
  assert.equal(photoInput.value, "");
  assert.equal(resumePage.innerHTML, previousPreview);
  assert.match(resumePage.innerHTML, /src="blob:test-1"/);
  assert.equal(warnings.children.length, 1);
  assert.equal(warnings.children[0].textContent, "请选择图片文件作为照片。");
});

test("keeps invalid photo warnings visible until the next render", async () => {
  const harness = createHarness();
  const editor = harness.elements["#editor"];
  const warnings = harness.elements["#warnings"];
  const photoInput = harness.elements["#photoInput"];

  await loadApp();

  editor.value = "Plain text without a name";
  editor.dispatch("input");

  assert.equal(warnings.children.length, 1);
  assert.match(warnings.children[0].textContent, /未识别到姓名/);

  photoInput.files = [{ name: "notes.txt", type: "text/plain" }];
  photoInput.dispatch("change");

  assert.equal(warnings.children.length, 1);
  assert.equal(warnings.children[0].textContent, "请选择图片文件作为照片。");

  editor.value = "Still missing a name";
  editor.dispatch("input");

  assert.equal(warnings.children.length, 1);
  assert.match(warnings.children[0].textContent, /未识别到姓名/);
});

test("accepts image photo uploads and renders the selected photo", async () => {
  const harness = createHarness();
  const resumePage = harness.elements["#resumePage"];
  const warnings = harness.elements["#warnings"];
  const photoInput = harness.elements["#photoInput"];
  const file = { name: "avatar.jpeg", type: "image/jpeg" };

  await loadApp();

  photoInput.files = [file];
  photoInput.dispatch("change");

  assert.deepEqual(harness.createdObjects, [file]);
  assert.match(resumePage.innerHTML, /src="blob:test-1"/);
  assert.equal(warnings.children.length, 0);
});

test("ignores markdown photo fields unless a photo is uploaded", async () => {
  const harness = createHarness();
  const editor = harness.elements["#editor"];
  const resumePage = harness.elements["#resumePage"];

  await loadApp();

  editor.value = `# 张三
工程师

照片：./avatar.jpg

## 技能
JavaScript`;
  editor.dispatch("input");

  assert.doesNotMatch(resumePage.innerHTML, /resume-photo/);
  assert.doesNotMatch(resumePage.innerHTML, /avatar\.jpg/);
});

test("throws a clear error when a required DOM hook is missing", async () => {
  const harness = createHarness();
  delete harness.elements["#warnings"];

  await assert.rejects(
    loadApp(),
    /Missing required app element: #warnings/
  );
});
