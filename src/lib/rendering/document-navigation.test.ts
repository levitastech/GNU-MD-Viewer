// @vitest-environment jsdom

import { describe, expect, it, vi } from 'vitest';
import { renderMarkdown } from '../markdown/engine';
import { sanitizeDocumentHtml } from './sanitize';
import { findDocumentAnchor, navigateDocument } from './document-navigation';

describe('navigation après sanitisation L11/L13', () => {
  it('conserve les tâches et chaque aller-retour de note répétée', () => {
    const article = document.createElement('article');
    article.innerHTML = sanitizeDocumentHtml(
      renderMarkdown(
        '# Été عربي\n\n- [x] Fait\n- [ ] À faire\n\nTexte[^n] et encore[^n].\n\n[^n]: Une note.',
      ).html,
    );
    const markers = article.querySelectorAll('.mdv-task');
    expect(
      Array.from(markers, (element) => element.getAttribute('aria-label')),
    ).toEqual(['Tâche terminée', 'Tâche non terminée']);
    expect(article.querySelector('input, [href], [src], [id]')).toBeNull();
    const anchors = Array.from(
      article.querySelectorAll<HTMLElement>('[data-mdv-anchor]'),
      (element) => element.dataset.mdvAnchor,
    );
    expect(new Set(anchors).size).toBe(anchors.length);
    for (const link of article.querySelectorAll<HTMLElement>(
      '[data-mdv-link-kind="local"]',
    )) {
      expect(findDocumentAnchor(article, link.dataset.mdvLink!)).not.toBeNull();
    }
    expect(article.querySelectorAll('.footnote-ref')).toHaveLength(2);
    expect(
      findDocumentAnchor(article, '#%C3%A9t%C3%A9-%D8%B9%D8%B1%D8%A8%D9%8A')
        ?.tagName,
    ).toBe('H1');
  });

  it('focalise la cible connue sans résoudre un ID de l’interface', () => {
    const article = document.createElement('article');
    article.innerHTML =
      '<h2 data-mdv-heading="mdv-heading-titre">Titre</h2><p data-mdv-anchor="mdv-note-1">Note</p>';
    document.body.append(article);
    const target = article.querySelector<HTMLElement>('h2')!;
    target.scrollIntoView = vi.fn();
    expect(navigateDocument(article, '#titre')).toBe(true);
    expect(document.activeElement).toBe(target);
    expect(target.scrollIntoView).toHaveBeenCalledOnce();
    expect(findDocumentAnchor(article, '#app-title')).toBeNull();
    expect(findDocumentAnchor(article, '#%FF')).toBeNull();
    expect(findDocumentAnchor(article, '#"][data-mdv-heading]')).toBeNull();
    article.remove();
  });
});
