// @vitest-environment jsdom

import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { renderMarkdown } from '../markdown/engine';
import { sanitizeDocumentHtml } from './sanitize';
import { findDocumentAnchor, navigateDocument } from './document-navigation';

describe('navigation après sanitisation L11/L13', () => {
  it('partage les cibles H1–H6 Unicode/code/liens et distingue notes et titres', () => {
    const source = readFileSync('tests/fixtures/v3/headings.md', 'utf8');
    const rendered = renderMarkdown(source);
    expect(renderMarkdown(source)).toEqual(rendered);
    const article = document.createElement('article');
    article.innerHTML = sanitizeDocumentHtml(rendered.html);
    expect(new Set(rendered.headings.map(({ id }) => id)).size).toBe(
      rendered.headings.length,
    );
    expect(new Set(rendered.headings.map(({ level }) => level))).toEqual(
      new Set([1, 2, 3, 4, 5, 6]),
    );
    expect(rendered.headings.find(({ level }) => level === 5)?.text).toBe(
      'code et lien',
    );
    for (const heading of rendered.headings) {
      expect(findDocumentAnchor(article, `#${heading.id}`)?.textContent).toBe(
        heading.text,
      );
    }
    expect(
      findDocumentAnchor(article, '#mdv-note-1')?.classList.contains(
        'footnote-item',
      ),
    ).toBe(true);
    expect(
      findDocumentAnchor(article, '#mdv-heading-mdv-note-1')?.tagName,
    ).toBe('H2');
    expect(
      findDocumentAnchor(article, '#e%CC%81te%CC%81-%D8%B9%D8%B1%D8%A8%D9%8A')
        ?.dataset.mdvHeading,
    ).toBe('mdv-heading-été-عربي');
    expect(findDocumentAnchor(article, '#introuvable')).toBeNull();
    expect(article.querySelector('[id], [href], script')).toBeNull();
  });

  it('conserve les espaces des titres multilignes et des slugs indépendants de la locale', () => {
    expect(
      renderMarkdown('I\n===\n\nTitre\nsur deux lignes\n---').headings.map(
        ({ id, text }) => [id, text],
      ),
    ).toEqual([
      ['mdv-heading-i', 'I'],
      ['mdv-heading-titre-sur-deux-lignes', 'Titre sur deux lignes'],
    ]);
  });
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
