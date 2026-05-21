export function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const SAFE_LINK_SCHEMES = new Set(["http:", "https:", "mailto:", "tel:"]);
const SAFE_PHOTO_SCHEMES = new Set(["http:", "https:", "blob:"]);
const SAFE_SECTION_TYPES = new Set(["plain", "skills", "education", "experience"]);
const WORD_JOINER = "\u2060";
const CJK_BOUND_PUNCTUATION = new Set("，。；：！？、）】》」』”’".split(""));

function hasAsciiControl(value) {
  return /[\u0000-\u001f\u007f]/.test(value);
}

function hasBackslash(value) {
  return value.includes("\\");
}

function sanitizeLinkHref(value) {
  const href = String(value ?? "").trim();
  const scheme = href.match(/^([a-z][a-z0-9+.-]*:)/i)?.[1].toLowerCase();

  if (!href || hasAsciiControl(href) || hasBackslash(href)) {
    return "#";
  }

  if (scheme) {
    return SAFE_LINK_SCHEMES.has(scheme) ? href : "#";
  }

  if (/^(?:\/(?!\/)|\.\/|\.\.\/|#)/.test(href)) {
    return href;
  }

  return "#";
}

function sanitizePhotoSrc(value) {
  const src = String(value ?? "").trim();
  const scheme = src.match(/^([a-z][a-z0-9+.-]*:)/i)?.[1].toLowerCase();

  if (!src || hasAsciiControl(src) || hasBackslash(src)) {
    return "";
  }

  if (/^data:image\/[a-z0-9.+-]+[;,]/i.test(src)) {
    return src;
  }

  if (scheme) {
    return SAFE_PHOTO_SCHEMES.has(scheme) ? src : "";
  }

  if (/^(?:\/(?!\/)|\.\/|\.\.\/)[^\s]*$/u.test(src)) {
    return src;
  }

  return "";
}

function isWhitespace(char) {
  return /\s/u.test(char);
}

function canBindAfterSource(text) {
  const chars = Array.from(String(text ?? ""));

  if (chars.length === 0) {
    return false;
  }

  return !isWhitespace(chars[chars.length - 1]);
}

function renderEscapedText(text, canBindLeadingPunctuation = false) {
  let html = "";
  let canBindNext = canBindLeadingPunctuation;

  for (const char of String(text ?? "")) {
    if (CJK_BOUND_PUNCTUATION.has(char) && canBindNext) {
      html += WORD_JOINER;
    }

    html += escapeHtml(char);
    canBindNext = !isWhitespace(char);
  }

  return { html, canBindNext };
}

function renderInlineText(text, canBindLeadingPunctuation = false) {
  const source = String(text ?? "");
  let html = "";
  let cursor = 0;
  let canBindNext = canBindLeadingPunctuation;
  const boldPattern = /(\*\*|__)([^\n]+?)\1/g;
  let match = boldPattern.exec(source);

  while (match) {
    const before = renderEscapedText(source.slice(cursor, match.index), canBindNext);
    html += before.html;
    canBindNext = before.canBindNext;

    const bold = renderEscapedText(match[2], canBindNext);
    html += `<strong>${bold.html}</strong>`;
    canBindNext = bold.canBindNext;
    cursor = match.index + match[0].length;
    match = boldPattern.exec(source);
  }

  const rest = renderEscapedText(source.slice(cursor), canBindNext);
  html += rest.html;
  return { html, canBindNext: rest.canBindNext };
}

function renderInlineMarkdown(text) {
  const source = String(text ?? "");
  let html = "";
  let cursor = 0;
  let canBindNext = false;
  const linkPattern = /\[([^\]\n]+)\]\(([^)\s]+)\)/g;
  let match = linkPattern.exec(source);

  while (match) {
    const before = renderInlineText(source.slice(cursor, match.index), canBindNext);
    html += before.html;
    canBindNext = before.canBindNext;
    html += `<a href="${escapeHtml(sanitizeLinkHref(match[2]))}">${escapeHtml(match[1])}</a>`;
    canBindNext = canBindAfterSource(match[1]);
    cursor = match.index + match[0].length;
    match = linkPattern.exec(source);
  }

  const rest = renderInlineText(source.slice(cursor), canBindNext);
  html += rest.html;
  return html;
}

function joinContactParts(parts) {
  return parts
    .filter(Boolean)
    .join("");
}

function renderContact(contact) {
  const label = contact?.label ? `${escapeHtml(contact.label)}：` : "";
  return `<span class="contact">${label}${escapeHtml(contact?.value)}</span>`;
}

function renderProfileLink(link) {
  const label = link?.label ? `${escapeHtml(link.label)}：` : "";
  const value = escapeHtml(link?.value);
  const href = escapeHtml(sanitizeLinkHref(link?.href ?? link?.value));

  return `<span class="contact resume-link">${label}<a href="${href}">${value}</a></span>`;
}

function renderProfile(profile = {}, uploadedPhoto = "") {
  const name = profile.name || "未命名";
  const contacts = Array.isArray(profile.contacts) ? profile.contacts.map(renderContact) : [];
  const links = Array.isArray(profile.links) ? profile.links.map(renderProfileLink) : [];
  const contactLine = joinContactParts(contacts.concat(links));
  const title = profile.title ? `<p class="resume-title">${escapeHtml(profile.title)}</p>` : "";
  const contactMarkup = contactLine ? `<div class="resume-contacts">${contactLine}</div>` : "";
  const photoSrc = sanitizePhotoSrc(uploadedPhoto);
  const photo = photoSrc
    ? `<img class="resume-photo" src="${escapeHtml(photoSrc)}" alt="">`
    : "";

  return `<header class="resume-header"><div class="resume-profile"><h1>${escapeHtml(name)}</h1>${title}${contactMarkup}</div>${photo}</header>`;
}

function renderListItems(items = []) {
  return items.map((item) => {
    const children = Array.isArray(item?.children) ? item.children : [];
    const nested = children.length > 0 ? renderList(children) : "";

    return `<li>${renderInlineMarkdown(item?.text)}${nested}</li>`;
  }).join("");
}

function renderList(items = []) {
  return `<ul>${renderListItems(items)}</ul>`;
}

function renderBlock(block) {
  if (!block) {
    return "";
  }

  if (block.type === "item") {
    const date = block.meta?.date ? `<span class="item-date">${escapeHtml(block.meta.date)}</span>` : "";
    const children = Array.isArray(block.children) ? block.children.map(renderBlock).join("") : "";

    return `<article class="resume-item"><div class="item-heading"><h3>${escapeHtml(block.title)}</h3>${date}</div><div class="item-body">${children}</div></article>`;
  }

  if (block.type === "list") {
    return renderList(block.items);
  }

  if (block.type === "paragraph") {
    return `<p>${renderInlineMarkdown(block.text)}</p>`;
  }

  return "";
}

function renderSection(section) {
  const inferredType = SAFE_SECTION_TYPES.has(section?.inferredType) ? section.inferredType : "plain";
  const blocks = Array.isArray(section?.blocks) ? section.blocks.map(renderBlock).join("") : "";

  return `<section class="resume-section resume-section-${inferredType}"><h2>${escapeHtml(section?.title)}</h2>${blocks}</section>`;
}

export function renderResumeHtml(doc = {}) {
  const sections = Array.isArray(doc.sections) ? doc.sections.map(renderSection).join("") : "";

  return `${renderProfile(doc.profile, doc.uploadedPhoto)}<main>${sections}</main>`;
}
