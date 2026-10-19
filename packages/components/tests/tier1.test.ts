import { test, expect } from "vitest";
import { createEngine } from "@ourform/core";
import { builtinFields, sanitizeContent } from "@ourform/components";
import { renderVNodeToString } from "@ourform/sdk";
test("all Tier 1 models compile on the public SDK and non-value controls never require data keys", () => {
  const e = createEngine();
  for (const field of builtinFields) e.register(field.model);
  const result = e.compile({
    $formVersion: "1.0",
    id: "tier",
    display: "form",
    components: builtinFields.map((field, i) => ({
      type: field.model.type,
      id: `f${i}`,
      ...(field.model.value ? { key: `f${i}` } : {}),
    })),
  });
  expect(result.ok).toBe(true);
  if (!result.ok) return;
  const s = e.createSession(result.form);
  expect(Object.keys(s.getData())).toHaveLength(10);
  expect(builtinFields.map((f) => f.model.type)).toEqual(
    expect.arrayContaining([
      "text",
      "textarea",
      "number",
      "email",
      "password",
      "checkbox",
      "radio",
      "select",
      "hidden",
      "content",
      "button",
    ]),
  );
  s.dispose();
});
test("Content uses a bounded allow-list of tags and anchor attributes, never raw HTML", () => {
  const attacks = [
    '<p onclick="bad()">Hello <strong>world</strong><script>alert(1)</script></p>',
    '<a href="javascript:alert(1)" onfocus="bad()">bad</a><img src=x onerror=bad()>',
    '<a href="java&#x73;cript&colon;alert(1)">encoded</a><svg><script>bad()</script></svg>',
    '<iframe srcdoc="bad">bad</iframe><math><mtext>bad</mtext></math>',
    "<style>body{display:none}</style><object>bad</object><template>bad</template><embed src=bad>",
    '<a href="https://example.com" style="color:red" target="_blank" title="ok">safe</a>',
    "<div><p>unclosed <b>bold</p></b></div><!-- comment -->",
    '<a href="java\nscript:alert(1)">control</a><a href="https://example.com\n">safe</a>',
    '<a href="tel:123">Phone</a><a href="mailto:a@example.com">Mail</a>',
    "<p>&lt;script&gt; &amp; &#0; &#x110000; &unknown;</p>",
    "<script><script>nested</script>still blocked</script>visible",
    "<p>".repeat(100) + "bounded" + "</p>".repeat(100),
  ];
  for (const attack of attacks) {
    const output = renderVNodeToString(sanitizeContent(attack));
    expect(output).not.toMatch(
      /<(script|iframe|img|svg|math|style|object|template|embed)\b/i,
    );
    expect(output).not.toMatch(
      /\son(?:click|error|focus)=|href="javascript:|\sstyle=/i,
    );
  }
  expect(
    renderVNodeToString(sanitizeContent("<p>Hello<br><em>team</em></p>")),
  ).toBe("<div><p>Hello<br><em>team</em></p></div>");
  expect(
    renderVNodeToString(
      sanitizeContent('<a href="https://example.com">Safe</a>'),
    ),
  ).toContain('href="https://example.com"');
});
