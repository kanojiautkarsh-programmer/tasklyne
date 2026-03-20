/**
 * Minimal markdown-to-HTML renderer for blog content.
 * Escapes all HTML entities FIRST to prevent XSS from LLM output,
 * then applies safe markdown transformations.
 */
export function renderMarkdown(text: string): string {
  // Step 1: Escape HTML to neutralize any injected tags/scripts
  const escaped = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

  // Step 2: Apply markdown transformations on the safe escaped string
  const transformed = escaped
    // Headings
    .replace(/^### (.+)$/gm, "<h3>$1</h3>")
    .replace(/^## (.+)$/gm, "<h2>$1</h2>")
    .replace(/^# (.+)$/gm, "<h1>$1</h1>")
    // Bold and italic
    .replace(/\*\*\*(.+?)\*\*\*/g, "<strong><em>$1</em></strong>")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    // Inline code
    .replace(/`(.+?)`/g, "<code>$1</code>")
    // Unordered lists
    .replace(/^[*-] (.+)$/gm, "<li>$1</li>")
    // Paragraphs (double newline)
    .replace(/\n\n/g, "</p><p>")
    // Single newlines within paragraphs
    .replace(/\n/g, "<br/>")
    // Wrap in paragraph
    .replace(/^/, "<p>")
    .replace(/$/, "</p>");

  // Step 3: Wrap consecutive <li> elements in <ul>...</ul>
  return transformed.replace(
    /(<li>.*?<\/li>)(?:<br\/>(<li>.*?<\/li>))*/g,
    (match) => `<ul>${match.replace(/<br\/>/g, "")}</ul>`,
  );
}
