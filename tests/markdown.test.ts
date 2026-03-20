import { describe, it, expect } from "vitest";
import { renderMarkdown } from "../src/lib/markdown";

describe("renderMarkdown", () => {
  // ── XSS prevention tests ───────────────────────────────────────────

  it("escapes <script> tags injected by LLM output", () => {
    const malicious = '<script>alert("xss")</script>';
    const result = renderMarkdown(malicious);
    expect(result).not.toContain("<script>");
    expect(result).not.toContain("</script>");
    expect(result).toContain("&lt;script&gt;");
  });

  it("escapes <img onerror> XSS vectors", () => {
    const malicious = '<img src=x onerror=alert(1)>';
    const result = renderMarkdown(malicious);
    expect(result).not.toContain("<img");
    expect(result).toContain("&lt;img");
  });

  it("escapes <iframe> injection", () => {
    const malicious = '<iframe src="https://evil.com"></iframe>';
    const result = renderMarkdown(malicious);
    expect(result).not.toContain("<iframe");
    expect(result).toContain("&lt;iframe");
  });

  it("escapes embedded event handlers", () => {
    const malicious = '<div onmouseover="alert(1)">hover me</div>';
    const result = renderMarkdown(malicious);
    expect(result).not.toContain("<div");
    expect(result).toContain("&lt;div");
  });

  it("escapes HTML entities in attribute values", () => {
    const malicious = '"><script>alert("xss")</script>';
    const result = renderMarkdown(malicious);
    expect(result).not.toContain("<script>");
    expect(result).toContain("&quot;");
    expect(result).toContain("&lt;script&gt;");
  });

  it("escapes single quotes", () => {
    const input = "it's a test";
    const result = renderMarkdown(input);
    expect(result).toContain("&#039;");
  });

  // ── Markdown rendering tests ───────────────────────────────────────

  it("renders h1 headings", () => {
    const result = renderMarkdown("# Hello World");
    expect(result).toContain("<h1>Hello World</h1>");
  });

  it("renders h2 headings", () => {
    const result = renderMarkdown("## Section Title");
    expect(result).toContain("<h2>Section Title</h2>");
  });

  it("renders h3 headings", () => {
    const result = renderMarkdown("### Sub Section");
    expect(result).toContain("<h3>Sub Section</h3>");
  });

  it("renders bold text", () => {
    const result = renderMarkdown("**bold text**");
    expect(result).toContain("<strong>bold text</strong>");
  });

  it("renders italic text", () => {
    const result = renderMarkdown("*italic text*");
    expect(result).toContain("<em>italic text</em>");
  });

  it("renders bold+italic text", () => {
    const result = renderMarkdown("***bold italic***");
    expect(result).toContain("<strong><em>bold italic</em></strong>");
  });

  it("renders inline code", () => {
    const result = renderMarkdown("`code`");
    expect(result).toContain("<code>code</code>");
  });

  it("renders unordered list items wrapped in <ul>", () => {
    const result = renderMarkdown("- item one\n- item two");
    expect(result).toContain("<ul>");
    expect(result).toContain("</ul>");
    expect(result).toContain("<li>item one</li>");
    expect(result).toContain("<li>item two</li>");
  });

  it("wraps a single list item in <ul>", () => {
    const result = renderMarkdown("- solo item");
    expect(result).toContain("<ul><li>solo item</li></ul>");
  });

  it("wraps output in paragraph tags", () => {
    const result = renderMarkdown("hello world");
    expect(result).toMatch(/^<p>.*<\/p>$/);
  });

  it("converts double newlines to paragraph breaks", () => {
    const result = renderMarkdown("para one\n\npara two");
    expect(result).toContain("</p><p>");
  });

  it("converts single newlines to <br/> tags", () => {
    const result = renderMarkdown("line one\nline two");
    expect(result).toContain("<br/>");
  });

  // ── Combined: markdown + XSS ──────────────────────────────────────

  it("processes markdown while still escaping HTML in mixed content", () => {
    const input = '# Title with <script>alert(1)</script>\n\n**bold** and <img src=x>';
    const result = renderMarkdown(input);
    expect(result).toContain("<h1>");
    expect(result).toContain("<strong>bold</strong>");
    expect(result).not.toContain("<script>");
    expect(result).not.toContain("<img");
  });
});
