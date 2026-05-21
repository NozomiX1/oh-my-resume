import test from "node:test";
import assert from "node:assert/strict";
import { renderResumeHtml, escapeHtml } from "../src/render.js";

test("escapes text before rendering", () => {
  assert.equal(escapeHtml(`<script>alert("x")</script>`), "&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;");
});

test("renders profile, contacts, external photo, sections, dates, and nested lists", () => {
  const html = renderResumeHtml({
    profile: {
      name: "张三",
      title: "算法工程师",
      contacts: [{ label: "电话", value: "138" }],
      links: [{ label: "GitHub", value: "github.com/example", href: "https://github.com/example" }],
      photo: ""
    },
    uploadedPhoto: "blob:photo",
    sections: [{
      title: "项目经历",
      inferredType: "experience",
      blocks: [{
        type: "item",
        title: "Benchmark 项目",
        meta: { date: "2024.01 - 2024.06" },
        children: [{
          type: "list",
          items: [{ text: "实现评测", children: [{ text: "支持嵌套 bullet" }] }]
        }]
      }]
    }],
    warnings: []
  });

  assert.match(html, /张三/);
  assert.match(html, /算法工程师/);
  assert.match(html, /resume-photo/);
  assert.match(html, /项目经历/);
  assert.match(html, /2024.01 - 2024.06/);
  assert.match(html, /支持嵌套 bullet/);
});

test("renders profile contacts without standalone separator elements", () => {
  const html = renderResumeHtml({
    profile: {
      name: "张三",
      title: "算法工程师",
      contacts: [
        { label: "电话", value: "138" },
        { label: "邮箱", value: "zhang@example.com" }
      ],
      links: [{ label: "GitHub", value: "github.com/example", href: "https://github.com/example" }],
      photo: ""
    },
    sections: [],
    warnings: []
  });

  assert.match(html, /<div class="resume-contacts"><span class="contact">电话：138<\/span><span class="contact">邮箱：zhang@example\.com<\/span><span class="contact resume-link">GitHub：<a href="https:\/\/github\.com\/example">github\.com\/example<\/a><\/span><\/div>/);
  assert.doesNotMatch(html, /contact-separator/);
  assert.doesNotMatch(html, />\|</);
});

test("ignores markdown profile photo fields during rendering", () => {
  const html = renderResumeHtml({
    profile: {
      name: "张三",
      title: "",
      contacts: [],
      links: [],
      photo: "./avatar.jpg"
    },
    sections: []
  });

  assert.doesNotMatch(html, /resume-photo/);
  assert.doesNotMatch(html, /avatar\.jpg/);
});

test("renders an uploaded photo supplied outside markdown", () => {
  const html = renderResumeHtml({
    profile: {
      name: "张三",
      title: "",
      contacts: [],
      links: [],
      photo: ""
    },
    uploadedPhoto: "blob:photo",
    sections: []
  });

  assert.match(html, /<img class="resume-photo" src="blob:photo" alt="">/);
});

test("renders page contents without creating a resume-page boundary", () => {
  const html = renderResumeHtml({
    profile: { name: "张三", title: "", contacts: [], links: [], photo: "" },
    sections: [],
    warnings: []
  });

  assert.match(html, /^<header class="resume-header">/);
  assert.doesNotMatch(html, /class="[^"]*\bresume-page\b/);
  assert.doesNotMatch(html, /density-/);
});

test("omits empty photo markup when photo is absent", () => {
  const html = renderResumeHtml({
    profile: { name: "张三", title: "", contacts: [], links: [], photo: "" },
    sections: [],
    warnings: []
  });

  assert.doesNotMatch(html, /resume-photo/);
});

test("escapes inline markdown links without allowing raw html injection", () => {
  const html = renderResumeHtml({
    profile: { name: "", title: "", contacts: [], links: [], photo: "" },
    sections: [{
      title: "链接",
      inferredType: "plain",
      blocks: [{
        type: "paragraph",
        text: `查看 [<b>site</b>](https://example.test/?q="<x>) 和 <img src=x onerror=alert(1)>`
      }]
    }],
    warnings: []
  });

  assert.match(html, /未命名/);
  assert.match(html, /<a href="https:\/\/example\.test\/\?q=&quot;&lt;x&gt;">&lt;b&gt;site&lt;\/b&gt;<\/a>/);
  assert.doesNotMatch(html, /<img src=x/);
});

test("renders inline bold markdown outside links", () => {
  const wordJoiner = "\u2060";
  const html = renderResumeHtml({
    profile: { name: "张三", title: "", contacts: [], links: [], photo: "" },
    sections: [{
      title: "技能",
      inferredType: "skills",
      blocks: [
        { type: "paragraph", text: "熟悉 **Python**、__TypeScript__ 和 [GitHub](https://github.com/example)" },
        { type: "list", items: [{ text: "负责 **模型评测** 与 __数据清洗__" }] }
      ]
    }]
  });

  assert.match(html, new RegExp(`熟悉 <strong>Python</strong>${wordJoiner}、<strong>TypeScript</strong> 和 <a href="https://github\\.com/example">GitHub</a>`));
  assert.match(html, /<li>负责 <strong>模型评测<\/strong> 与 <strong>数据清洗<\/strong><\/li>/);
});

test("binds Chinese punctuation to previous text without changing links", () => {
  const wordJoiner = "\u2060";
  const html = renderResumeHtml({
    profile: { name: "张三", title: "", contacts: [], links: [], photo: "" },
    sections: [{
      title: "项目",
      inferredType: "experience",
      blocks: [
        { type: "paragraph", text: "负责模型评测，并完成交付。" },
        {
          type: "list",
          items: [
            { text: "优化核心循环，完成方向转型。" },
            { text: "查看 [项目。](https://example.com/a,b)。" }
          ]
        }
      ]
    }]
  });

  assert.match(html, new RegExp(`负责模型评测${wordJoiner}，并完成交付${wordJoiner}。`));
  assert.match(html, new RegExp(`<li>优化核心循环${wordJoiner}，完成方向转型${wordJoiner}。</li>`));
  assert.match(html, new RegExp(`<a href="https://example\\.com/a,b">项目。</a>${wordJoiner}。`));
  assert.doesNotMatch(html, new RegExp(`项目${wordJoiner}。`));
  assert.doesNotMatch(html, new RegExp(`https://example\\.com/a${wordJoiner},b`));
});

test("escapes inline bold markdown content", () => {
  const html = renderResumeHtml({
    profile: { name: "张三", title: "", contacts: [], links: [], photo: "" },
    sections: [{
      title: "安全",
      inferredType: "plain",
      blocks: [{ type: "paragraph", text: "**<img src=x onerror=alert(1)>**" }]
    }]
  });

  assert.match(html, /<strong>&lt;img src=x onerror=alert\(1\)&gt;<\/strong>/);
  assert.doesNotMatch(html, /<img src=x/);
});

test("renders leaf list items with absent or empty children", () => {
  const html = renderResumeHtml({
    profile: { name: "张三", title: "", contacts: [], links: [], photo: "" },
    sections: [{
      title: "技能",
      inferredType: "skills",
      blocks: [{
        type: "list",
        items: [
          { text: "JavaScript" },
          { text: "TypeScript", children: [] }
        ]
      }]
    }],
    warnings: []
  });

  assert.match(html, /<li>JavaScript<\/li>/);
  assert.match(html, /<li>TypeScript<\/li>/);
});

test("neutralizes unsafe inline markdown link schemes", () => {
  const html = renderResumeHtml({
    profile: { name: "张三", title: "", contacts: [], links: [], photo: "" },
    sections: [{
      title: "链接",
      inferredType: "plain",
      blocks: [{ type: "paragraph", text: "查看 [bad](javascript:alert(1))" }]
    }]
  });

  assert.doesNotMatch(html, /href="javascript:/i);
  assert.match(html, /<a href="#">bad<\/a>/);
});

test("neutralizes unsafe profile link schemes", () => {
  const html = renderResumeHtml({
    profile: {
      name: "张三",
      title: "",
      contacts: [],
      links: [{ label: "GitHub", value: "bad", href: "javascript:alert(1)" }],
      photo: ""
    },
    sections: []
  });

  assert.doesNotMatch(html, /href="javascript:/i);
  assert.match(html, /<a href="#">bad<\/a>/);
});

test("rejects unsafe photo sources", () => {
  const javascriptPhoto = renderResumeHtml({
    profile: { name: "张三", title: "", contacts: [], links: [], photo: "" },
    uploadedPhoto: "javascript:alert(1)",
    sections: []
  });
  const htmlPhoto = renderResumeHtml({
    profile: { name: "张三", title: "", contacts: [], links: [], photo: "" },
    uploadedPhoto: "data:text/html,<script>alert(1)</script>",
    sections: []
  });

  assert.doesNotMatch(javascriptPhoto, /resume-photo/);
  assert.doesNotMatch(htmlPhoto, /resume-photo/);
});

test("allows safe photo sources", () => {
  const dataImage = renderResumeHtml({
    profile: { name: "张三", title: "", contacts: [], links: [], photo: "" },
    uploadedPhoto: "data:image/png;base64,AAAA",
    sections: []
  });
  const blobImage = renderResumeHtml({
    profile: { name: "张三", title: "", contacts: [], links: [], photo: "" },
    uploadedPhoto: "blob:photo",
    sections: []
  });

  assert.match(dataImage, /<img class="resume-photo" src="data:image\/png;base64,AAAA" alt="">/);
  assert.match(blobImage, /<img class="resume-photo" src="blob:photo" alt="">/);
});

test("neutralizes protocol-relative links", () => {
  const html = renderResumeHtml({
    profile: { name: "张三", title: "", contacts: [], links: [], photo: "" },
    sections: [{
      title: "链接",
      inferredType: "plain",
      blocks: [{ type: "paragraph", text: "查看 [bad](//evil.test)" }]
    }]
  });

  assert.doesNotMatch(html, /href="\/\/evil\.test"/);
  assert.match(html, /<a href="#">bad<\/a>/);
});

test("allows safe relative links", () => {
  const html = renderResumeHtml({
    profile: { name: "张三", title: "", contacts: [], links: [], photo: "" },
    sections: [{
      title: "链接",
      inferredType: "plain",
      blocks: [{
        type: "paragraph",
        text: "[root](/safe) [dot](./safe) [parent](../safe) [anchor](#anchor)"
      }]
    }]
  });

  assert.match(html, /<a href="\/safe">root<\/a>/);
  assert.match(html, /<a href="\.\/safe">dot<\/a>/);
  assert.match(html, /<a href="\.\.\/safe">parent<\/a>/);
  assert.match(html, /<a href="#anchor">anchor<\/a>/);
});

test("does not render arbitrary section class tokens", () => {
  const html = renderResumeHtml({
    profile: { name: "张三", title: "", contacts: [], links: [], photo: "" },
    sections: [{
      title: "恶意",
      inferredType: `plain" onclick="alert(1) evil`,
      blocks: []
    }]
  });

  assert.match(html, /class="resume-section resume-section-plain"/);
  assert.doesNotMatch(html, /onclick/);
  assert.doesNotMatch(html, /resume-section-plain&quot;/);
});

test("neutralizes inline markdown links containing backslashes", () => {
  const html = renderResumeHtml({
    profile: { name: "张三", title: "", contacts: [], links: [], photo: "" },
    sections: [{
      title: "链接",
      inferredType: "plain",
      blocks: [{
        type: "paragraph",
        text: String.raw`[one](/\evil.test) [two](/\/evil.test)`
      }]
    }]
  });

  assert.doesNotMatch(html, /href="\/\\/);
  assert.equal((html.match(/href="#"/g) ?? []).length, 2);
});

test("neutralizes profile links containing backslashes", () => {
  const html = renderResumeHtml({
    profile: {
      name: "张三",
      title: "",
      contacts: [],
      links: [
        { label: "one", value: "one", href: String.raw`/\evil.test` },
        { label: "two", value: "two", href: String.raw`/\/evil.test` }
      ],
      photo: ""
    },
    sections: []
  });

  assert.doesNotMatch(html, /href="\/\\/);
  assert.equal((html.match(/href="#"/g) ?? []).length, 2);
});
