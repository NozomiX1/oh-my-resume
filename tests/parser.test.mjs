import test from "node:test";
import assert from "node:assert/strict";
import { parseResumeMarkdown, isDateLine } from "../src/parser.js";

test("parses profile fields before first section", () => {
  const doc = parseResumeMarkdown(`# 张三
前端工程师

电话：138-0000-0000
邮箱：zhang@example.com
城市：上海
个人网站：github.com/example
照片：./avatar.jpg
头像：./headshot.png

## 技能
TypeScript, React`);

  assert.equal(doc.profile.name, "张三");
  assert.equal(doc.profile.title, "前端工程师");
  assert.deepEqual(doc.profile.contacts, [
    { label: "电话", value: "138-0000-0000" },
    { label: "邮箱", value: "zhang@example.com" },
    { label: "城市", value: "上海" }
  ]);
  assert.deepEqual(doc.profile.links, [
    { label: "个人网站", value: "github.com/example", href: "https://github.com/example" }
  ]);
  assert.equal(doc.profile.photo, "");
  assert.equal(doc.profile.contacts.some((contact) => contact.label === "照片" || contact.label === "头像"), false);
});

test("preserves unknown profile labels in contacts", () => {
  const doc = parseResumeMarkdown(`# 张三
求职状态：正在看机会

## 技能
JavaScript`);

  assert.deepEqual(doc.profile.contacts, [{ label: "求职状态", value: "正在看机会" }]);
});

test("warns when no name heading is found", () => {
  const doc = parseResumeMarkdown(`前端工程师

## 技能
JavaScript`);

  assert.equal(doc.profile.name, "");
  assert.deepEqual(doc.warnings, ["未识别到姓名，请使用一级标题格式，例如 # 张三。"]);
});

test("warns when name is missing and preserves unknown profile labels", () => {
  const doc = parseResumeMarkdown(`电话：138
所在地：杭州

## 技能
Python`);

  assert.equal(doc.warnings.length, 1);
  assert.equal(doc.warnings[0].includes("未识别到姓名"), true);
  assert.deepEqual(doc.profile.contacts, [
    { label: "电话", value: "138" },
    { label: "所在地", value: "杭州" }
  ]);
});

test("keeps the first name if repeated name headings appear before sections", () => {
  const doc = parseResumeMarkdown(`# 张三
# 不应覆盖

## 技能
JavaScript`);

  assert.equal(doc.profile.name, "张三");
});

test("keeps arbitrary sections and item blocks", () => {
  const doc = parseResumeMarkdown(`## 开源贡献

### Markdown Resume Builder
2024.01 - 2024.06
- 实现解析器
  - 支持嵌套列表
- 实现模板`);

  assert.equal(doc.sections.length, 1);
  assert.equal(doc.sections[0].title, "开源贡献");
  assert.equal(doc.sections[0].blocks[0].type, "item");
  assert.equal(doc.sections[0].blocks[0].title, "Markdown Resume Builder");
  assert.equal(doc.sections[0].blocks[0].meta.date, "2024.01 - 2024.06");
  assert.equal(doc.sections[0].blocks[0].children[0].type, "list");
  assert.equal(doc.sections[0].blocks[0].children[0].items[0].children[0].text, "支持嵌套列表");
  assert.equal(doc.sections[0].blocks[0].children[0].items[1].text, "实现模板");
});

test("keeps consecutive top-level bullets as siblings", () => {
  const doc = parseResumeMarkdown(`## 项目经历

### 丹道：AI 辅助独立游戏开发
- **独立游戏开发**： 探索 “Vibe Coding” 模式，使用 Godot + GDScript 独立完成 15k+ 行修仙游戏原型，含 12个解耦子系统（战斗/炼丹/秘境/任务等）。
- **机制设计**： 通过对《以撒》、《杀戮尖塔》等经典 Roguelike 游戏的机制解构，优化核心循环，完成了“修仙 + Rouge like + 经营”的方向转型。
- **前沿美术管线探索**：深度调研 Rain World（程序化动画）、Dead Cells（3D 转 2D 流程）及 Gris（色彩分级与 Shader）的技术方案，探索自动化流程。`);
  const items = doc.sections[0].blocks[0].children[0].items;

  assert.equal(items.length, 3);
  assert.deepEqual(items.map((item) => item.children.length), [0, 0, 0]);
  assert.equal(items[0].text.startsWith("**独立游戏开发**"), true);
  assert.equal(items[1].text.startsWith("**机制设计**"), true);
  assert.equal(items[2].text.startsWith("**前沿美术管线探索**"), true);
});

test("keeps a top-level sibling after a nested bullet", () => {
  const doc = parseResumeMarkdown(`## 项目经历

### Markdown Resume Builder
- 实现解析器
  - 支持嵌套列表
- 实现模板`);
  const items = doc.sections[0].blocks[0].children[0].items;

  assert.equal(items.length, 2);
  assert.equal(items[0].text, "实现解析器");
  assert.equal(items[0].children[0].text, "支持嵌套列表");
  assert.equal(items[1].text, "实现模板");
  assert.equal(items[1].children.length, 0);
});

test("uses the first obvious item date after context paragraphs before lists", () => {
  const doc = parseResumeMarkdown(`## 项目经历

### 某项目
上海
2024.01 - 2024.06
- 做了什么`);
  const item = doc.sections[0].blocks[0];

  assert.equal(item.meta.date, "2024.01 - 2024.06");
  assert.deepEqual(item.children[0], { type: "paragraph", text: "上海" });
  assert.equal(item.children[1].type, "list");
});

test("uses standalone duration labels as item dates", () => {
  const doc = parseResumeMarkdown(`## 项目经历

### 排练管理模板
长期
- 自建排练记录模板`);
  const item = doc.sections[0].blocks[0];

  assert.equal(item.meta.date, "长期");
  assert.equal(item.children[0].type, "list");
  assert.equal(isDateLine("长期进行排练管理"), false);
});

test("does not promote item date lines after lists", () => {
  const doc = parseResumeMarkdown(`## 项目经历

### 某项目
- 做了什么
2024.01 - 2024.06`);
  const item = doc.sections[0].blocks[0];

  assert.equal(item.meta.date, undefined);
  assert.deepEqual(item.children[1], { type: "paragraph", text: "2024.01 - 2024.06" });
});

test("renders unknown body text as paragraphs instead of failing", () => {
  const doc = parseResumeMarkdown(`## 自定义栏目
这是一段普通说明。
第二段继续说明。`);

  assert.equal(doc.sections[0].blocks.length, 2);
  assert.deepEqual(doc.sections[0].blocks.map((block) => block.type), ["paragraph", "paragraph"]);
});

test("places body content before any section into a fallback section", () => {
  const doc = parseResumeMarkdown(`# 张三
前端工程师

这段内容还没有栏目标题。

## 技能
JavaScript`);

  assert.equal(doc.sections[0].title, "内容");
  assert.deepEqual(doc.sections[0].blocks[0], {
    type: "paragraph",
    text: "这段内容还没有栏目标题。"
  });
  assert.equal(doc.sections[1].title, "技能");
});

test("places list content before any section into a fallback section", () => {
  const doc = parseResumeMarkdown(`- 独立列表
  - 子项

## 技能
JavaScript`);

  assert.equal(doc.sections[0].title, "内容");
  assert.equal(doc.sections[0].blocks[0].type, "list");
  assert.equal(doc.sections[0].blocks[0].items[0].text, "独立列表");
  assert.equal(doc.sections[0].blocks[0].items[0].children[0].text, "子项");
});

test("infers section types from section titles", () => {
  const doc = parseResumeMarkdown(`## 技能
JavaScript

## Education
University

## 项目经历
Project

## 自定义
Text`);

  assert.deepEqual(doc.sections.map((section) => section.inferredType), [
    "skills",
    "education",
    "experience",
    "plain"
  ]);
});

test("recognizes common Chinese and numeric date lines", () => {
  assert.equal(isDateLine("2022年09月 - 2026年06月"), true);
  assert.equal(isDateLine("2023.08 - 2025.08"), true);
  assert.equal(isDateLine("2018 - 2022"), true);
  assert.equal(isDateLine("2023.08 - 至今"), true);
  assert.equal(isDateLine("长期"), true);
  assert.equal(isDateLine("Python, PyTorch, React"), false);
});
