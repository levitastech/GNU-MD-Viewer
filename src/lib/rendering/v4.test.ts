// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { renderMarkdown } from '../markdown/engine';
import {
  asUnsanitizedHtml,
  sanitizeDocumentHtml,
  sanitizeMermaidSvg,
} from './sanitize';
import { renderMermaid } from './mermaid';
import * as mermaidModule from './mermaid';
import { enrichDocument } from './enrich-document';

describe('L16 rendu Mermaid borné', () => {
  it('conserve deux occurrences identiques et leur source après sanitisation', () => {
    const result = renderMarkdown(
      '```mermaid\nflowchart TD\n A-->B\n```\n\n```mermaid\nflowchart TD\n A-->B\n```',
    );
    expect(result.enrichments.map((b) => b.occurrence)).toEqual([0, 1]);
    const root = document.createElement('article');
    root.innerHTML = sanitizeDocumentHtml(result.html);
    expect(root.querySelectorAll('[data-mdv-enrichment]').length).toBe(2);
    expect(root.textContent).toContain('A-->B');
  });
  it('refuse directives, interactions, familles inconnues et dépassements', async () => {
    for (const source of [
      '%%{init: {securityLevel: "loose"}}%%\nflowchart TD\nA-->B',
      'flowchart TD\nA-->B\nclick A "https://example.test"',
      'x'.repeat(65537),
    ]) {
      expect((await renderMermaid(source, 'mdv-test')).status).toBe('fallback');
    }
  });
  it('supprime SVG actif et références non locales ou absentes', () => {
    const result = sanitizeMermaidSvg(
      asUnsanitizedHtml(
        '<svg><script>alert(1)</script><foreignObject>x</foreignObject><path fill="url(https://example.test/a)" stroke="url(#missing)"/><path id="safe"/><path fill="url(#safe)"/></svg>',
      ),
    );
    expect(result).not.toMatch(/script|foreignObject|https:|missing/);
    expect(result).toContain('url(#safe)');
  });
  it('ne modifie pas un document annulé', async () => {
    const result = renderMarkdown('```mermaid\nflowchart TD\nA-->B\n```');
    const root = document.createElement('article');
    root.innerHTML = sanitizeDocumentHtml(result.html);
    const before = root.innerHTML;
    const abort = new AbortController();
    abort.abort();
    await enrichDocument(root, result.enrichments, false, abort.signal);
    expect(root.innerHTML).toBe(before);
  });
  it('abandonne un résultat arrivé après le changement de document', async () => {
    let resolve!: (value: Awaited<ReturnType<typeof renderMermaid>>) => void;
    const delayed = new Promise<Awaited<ReturnType<typeof renderMermaid>>>(
      (done) => {
        resolve = done;
      },
    );
    const spy = vi
      .spyOn(mermaidModule, 'renderMermaid')
      .mockReturnValue(delayed);
    const result = renderMarkdown('```mermaid\nflowchart TD\nA-->B\n```');
    const root = document.createElement('article');
    root.innerHTML = sanitizeDocumentHtml(result.html);
    const before = root.innerHTML;
    const abort = new AbortController();
    const rendering = enrichDocument(
      root,
      result.enrichments,
      false,
      abort.signal,
    );
    await vi.waitFor(() => expect(spy).toHaveBeenCalled());
    abort.abort();
    resolve({
      status: 'rendered',
      svg: sanitizeMermaidSvg(
        asUnsanitizedHtml('<svg><text>tardif</text></svg>'),
      ),
    });
    await rendering;
    expect(root.innerHTML).toBe(before);
    spy.mockRestore();
  });
});
