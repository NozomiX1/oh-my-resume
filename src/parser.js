const CONTACT_LABELS = new Set(["电话", "邮箱", "城市"]);
const LINK_LABELS = new Set(["GitHub", "Github", "LinkedIn", "个人网站", "网站", "主页"]);
const IGNORED_PROFILE_LABELS = new Set(["照片", "头像"]);

function createDocument() {
  return {
    profile: {
      name: "",
      title: "",
      contacts: [],
      links: [],
      photo: ""
    },
    sections: [],
    warnings: []
  };
}

function normalizeLineEndings(markdown) {
  return String(markdown ?? "").replace(/\r\n?/g, "\n");
}

function parseLabelLine(line) {
  const match = line.match(/^([^:：]+?)\s*[:：]\s*(.+)$/);

  if (!match) {
    return null;
  }

  return {
    label: match[1].trim(),
    value: match[2].trim()
  };
}

function normalizeHref(value) {
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(value) || /^mailto:/i.test(value)) {
    return value;
  }

  return `https://${value}`;
}

function inferSectionType(title) {
  const normalized = title.toLowerCase();

  if (/技能|skill/.test(normalized)) {
    return "skills";
  }

  if (/教育|education/.test(normalized)) {
    return "education";
  }

  if (/项目|project|经历|experience|实习|intern/.test(normalized)) {
    return "experience";
  }

  return "plain";
}

function createSection(title) {
  return {
    title,
    blocks: [],
    inferredType: inferSectionType(title)
  };
}

function createFallbackSection(doc) {
  let section = doc.sections.find((candidate) => candidate.title === "内容");

  if (!section) {
    section = createSection("内容");
    doc.sections.push(section);
  }

  return section;
}

function isListLine(line) {
  return /^(\s*)[-*+]\s+(.+)$/.test(line);
}

function parseList(lines, startIndex) {
  const root = { type: "list", items: [] };
  const firstMatch = lines[startIndex]?.match(/^(\s*)[-*+]\s+(.+)$/);
  const baseIndent = firstMatch ? firstMatch[1].replace(/\t/g, "    ").length : 0;
  const stack = [{ indent: baseIndent, items: root.items, lastItem: null }];
  let index = startIndex;

  while (index < lines.length) {
    const line = lines[index];

    if (!line.trim()) {
      index += 1;
      continue;
    }

    if (/^\s{0,3}#{2,3}\s+/.test(line) || !isListLine(line)) {
      break;
    }

    const match = line.match(/^(\s*)[-*+]\s+(.+)$/);
    const indent = match[1].replace(/\t/g, "    ").length;
    const item = { text: match[2].trim(), children: [] };
    let parent = stack[stack.length - 1];

    if (indent > parent.indent && parent.lastItem) {
      parent = { indent, items: parent.lastItem.children, lastItem: null };
      stack.push(parent);
    } else {
      while (indent < parent.indent && stack.length > 1) {
        stack.pop();
        parent = stack[stack.length - 1];
      }

      if (indent > parent.indent && !parent.lastItem) {
        parent = stack[stack.length - 1];
      }
    }

    parent.items.push(item);
    parent.lastItem = item;
    index += 1;
  }

  return { block: root, nextIndex: index };
}

function addProfileField(profile, label, value) {
  if (CONTACT_LABELS.has(label)) {
    profile.contacts.push({ label, value });
    return;
  }

  if (LINK_LABELS.has(label)) {
    profile.links.push({ label, value, href: normalizeHref(value) });
    return;
  }

  if (IGNORED_PROFILE_LABELS.has(label)) {
    return;
  }

  profile.contacts.push({ label, value });
}

function parseProfile(lines, doc) {
  let hasName = false;
  const bodyLines = [];

  for (const line of lines) {
    const trimmed = line.trim();

    if (!trimmed) {
      continue;
    }

    if (trimmed.startsWith("# ")) {
      if (hasName) {
        continue;
      }

      doc.profile.name = trimmed.slice(2).trim();
      hasName = true;
      continue;
    }

    const labelLine = parseLabelLine(trimmed);

    if (labelLine) {
      addProfileField(doc.profile, labelLine.label, labelLine.value);
      continue;
    }

    if (hasName && !doc.profile.title) {
      doc.profile.title = trimmed;
      continue;
    }

    bodyLines.push(line);
  }

  if (!doc.profile.name) {
    doc.warnings.push("未识别到姓名，请使用一级标题格式，例如 # 张三。");
  }

  return bodyLines;
}

function targetBlocks(doc, currentSection, currentItem) {
  if (currentItem) {
    return currentItem.children;
  }

  return (currentSection ?? createFallbackSection(doc)).blocks;
}

function canPromoteItemDate(item) {
  return item && !item.meta.date && !item.children.some((child) => child.type === "list");
}

export function isDateLine(line) {
  const trimmed = String(line ?? "").trim();
  const datePart = String.raw`\d{4}(?:\s*年\s*\d{1,2}\s*月?|\s*[./-]\s*\d{1,2})?`;
  const openEnded = String.raw`(?:至今|现在|Present|present)`;
  const durationLabel = /^(?:长期|短期|持续|不定期)$/;
  const range = new RegExp(String.raw`^${datePart}\s*(?:-|–|—|~|至|到)\s*(?:${datePart}|${openEnded})$`);

  return range.test(trimmed) || durationLabel.test(trimmed);
}

export function parseResumeMarkdown(markdown) {
  const doc = createDocument();
  const lines = normalizeLineEndings(markdown).split("\n");
  const firstSectionIndex = lines.findIndex((line) => line.trim().startsWith("## "));
  const profileLines = firstSectionIndex === -1 ? lines : lines.slice(0, firstSectionIndex);
  const sectionLines = firstSectionIndex === -1 ? [] : lines.slice(firstSectionIndex);
  let currentSection = null;
  let currentItem = null;
  let bodyLines = [];
  let index = 0;

  bodyLines = parseProfile(profileLines, doc).concat(sectionLines);

  while (index < bodyLines.length) {
    const rawLine = bodyLines[index];
    const trimmed = rawLine.trim();

    if (!trimmed) {
      index += 1;
      continue;
    }

    if (trimmed.startsWith("## ")) {
      currentSection = createSection(trimmed.slice(3).trim());
      doc.sections.push(currentSection);
      currentItem = null;
      index += 1;
      continue;
    }

    if (trimmed.startsWith("### ")) {
      currentSection = currentSection ?? createFallbackSection(doc);
      currentItem = {
        type: "item",
        title: trimmed.slice(4).trim(),
        meta: {},
        children: []
      };
      currentSection.blocks.push(currentItem);
      index += 1;
      continue;
    }

    if (canPromoteItemDate(currentItem) && isDateLine(trimmed)) {
      currentItem.meta.date = trimmed;
      index += 1;
      continue;
    }

    if (isListLine(rawLine)) {
      const parsed = parseList(bodyLines, index);
      targetBlocks(doc, currentSection, currentItem).push(parsed.block);
      index = parsed.nextIndex;
      continue;
    }

    targetBlocks(doc, currentSection, currentItem).push({
      type: "paragraph",
      text: trimmed
    });
    index += 1;
  }

  return doc;
}
