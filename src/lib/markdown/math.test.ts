// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { renderMarkdown } from './engine';
import { renderKatex } from '../rendering/katex';

describe('L15 délimiteurs mathématiques et isolation', () => {
  it('reconnaît inline/display, garde monnaie, code et délimiteurs incomplets', () => {
    const result = renderMarkdown(
      String.raw`Math \(x^2\). $20 et $30. \(incomplet

$$
\frac{1}{2}
$$

\[
x+1
\]

` +
        '`' +
        String.raw`\(code\)` +
        '`',
    );
    expect(result.enrichments.map((b) => b.kind)).toEqual([
      'katex-inline',
      'katex-block',
      'katex-block',
    ]);
    expect(result.html).toContain('$20 et $30');
    expect(result.html).toContain('incomplet');
  });
  it('sanitise les maths, bloque liens et ne partage pas les macros', () => {
    const first = renderKatex(String.raw`\gdef\leak{SECRET}\leak`, false);
    expect(first.status).toBe('rendered');
    expect(renderKatex(String.raw`\leak`, false).status).toBe('fallback');
    const link = renderKatex(
      String.raw`\href{https://example.invalid}{texte}`,
      false,
    );
    if (link.status === 'rendered') expect(link.html).not.toMatch(/href=|src=/);
    expect(renderKatex(String.raw`\def\a{\a}\a`, false).status).toBe(
      'fallback',
    );
    expect(renderKatex('x'.repeat(16385), false).status).toBe('fallback');
  });
});
