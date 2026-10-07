// @vitest-environment jsdom

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { renderMarkdown } from '../markdown/engine';
import { markAlertSemantics } from './alert-semantics';
import { findDocumentAnchor } from './document-navigation';
import { sanitizeDocumentHtml } from './sanitize';

describe('corpus combiné L13 après sanitisation', () => {
  it('conserve tâches imbriquées, cinq alertes et notes répétées sans contrôle éditable', () => {
    const source = readFileSync('tests/fixtures/v3/extensions.md', 'utf8');
    const rendered = renderMarkdown(source);
    const article = document.createElement('article');
    article.innerHTML = sanitizeDocumentHtml(rendered.html);
    markAlertSemantics(article);

    expect(article.querySelectorAll('.mdv-task').length).toBe(4);
    expect(
      article.querySelectorAll('.mdv-task[aria-label="Tâche terminée"]').length,
    ).toBe(2);
    expect(
      article.querySelectorAll('.mdv-task[aria-label="Tâche non terminée"]')
        .length,
    ).toBe(2);
    expect(article.querySelectorAll('li li .mdv-task').length).toBe(2);
    expect(
      article.querySelector('input, button, script, [href], [id]'),
    ).toBeNull();

    for (const kind of ['note', 'tip', 'important', 'warning', 'caution'])
      expect(article.querySelectorAll(`.markdown-alert-${kind}`).length).toBe(
        1,
      );
    expect(article.querySelectorAll('.markdown-alert').length).toBe(5);
    expect(
      article.querySelectorAll('.markdown-alert[role="note"]').length,
    ).toBe(5);
    expect(article.querySelectorAll('blockquote').length).toBe(1);
    expect(article.querySelector('pre code')?.textContent).toContain(
      '> [!WARNING]',
    );

    const sharedReferences = article.querySelectorAll<HTMLElement>(
      '[data-mdv-link="#mdv-note-1"]',
    );
    expect(sharedReferences.length).toBe(4);
    expect(article.querySelectorAll('.footnote-item').length).toBe(2);
    expect(findDocumentAnchor(article, '#mdv-note-1')?.textContent).toContain(
      'Note partagée',
    );
    const anchors = Array.from(
      article.querySelectorAll<HTMLElement>('[data-mdv-anchor]'),
      (element) => element.dataset.mdvAnchor,
    );
    expect(new Set(anchors).size).toBe(anchors.length);
    for (const anchor of anchors)
      expect(findDocumentAnchor(article, `#${anchor}`)).not.toBeNull();
  });

  it('neutralise le HTML hostile dans un titre d’alerte personnalisé', () => {
    const html = sanitizeDocumentHtml(
      renderMarkdown(
        '> [!WARNING] <img src="https://example.invalid/x" onerror="alert(1)">\n> Texte sûr.',
      ).html,
    );
    const article = document.createElement('article');
    article.innerHTML = html;
    expect(article.querySelector('.markdown-alert-warning')).not.toBeNull();
    expect(article.querySelector('[src], [onerror], script')).toBeNull();
  });
});
