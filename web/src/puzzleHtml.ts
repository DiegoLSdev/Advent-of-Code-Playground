import DOMPurify from 'dompurify';

DOMPurify.addHook('afterSanitizeAttributes', (node) => {
  if (node.tagName === 'A') {
    node.setAttribute('target', '_blank');
    node.setAttribute('rel', 'noopener');
  }
});

export function sanitize(html: string): string {
  return DOMPurify.sanitize(html);
}

function parse(html: string): Document {
  return new DOMParser().parseFromString(html, 'text/html');
}

/** First code block of the puzzle text: almost always the example input. */
export function extractExample(partHtml: string | undefined): string {
  if (!partHtml) return '';
  return parse(partHtml).querySelector('pre > code')?.textContent ?? '';
}

/**
 * Example answer. AoC usually highlights it as <code><em>…</em></code> near
 * the end of the explanation; it is a heuristic and can be wrong.
 */
export function extractExampleAnswer(partHtml: string | undefined): string | undefined {
  if (!partHtml) return undefined;
  const highlighted = [...parse(partHtml).querySelectorAll('code > em, em > code')];
  return highlighted.at(-1)?.textContent?.trim() || undefined;
}
