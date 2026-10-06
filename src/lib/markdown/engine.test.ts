import { describe, expect, it } from 'vitest';

import { renderMarkdown } from './engine';

describe('moteur Markdown L06', () => {
  it('rend le profil ciblé sans activer le HTML brut', () => {
    const rendered = renderMarkdown(`
# Titre

| Colonne | Valeur |
| --- | --- |
| ~~ancien~~ | https://example.test |

<script>alert('non')</script>

\`\`\`js
const value = '<b>texte</b>';
\`\`\`
`);

    expect(rendered.html).toContain('<table>');
    expect(rendered.html).toContain('<s>ancien</s>');
    expect(rendered.html).toContain('data-mdv-link="https://example.test"');
    expect(rendered.html).toContain('&lt;script&gt;');
    expect(rendered.html).not.toContain("<script>alert('non')</script>");
    expect(rendered.html).toContain('&lt;b&gt;texte&lt;/b&gt;');
  });

  it('produit des titres Unicode uniques et déterministes', () => {
    const source = '# Été عربي 🚀\n\n## Été عربي 🚀\n';
    const first = renderMarkdown(source);
    const second = renderMarkdown(source);

    expect(first).toEqual(second);
    expect(first.headings.map(({ id }) => id)).toEqual([
      'mdv-heading-été-عربي',
      'mdv-heading-été-عربي-1',
    ]);
    expect(first.headings[0]?.position).toEqual({
      line: 1,
      column: 1,
      offset: 0,
    });
  });

  it('déclare les images locales sans charger les images distantes', () => {
    const rendered = renderMarkdown(
      '![locale](assets/image.png) ![distante](https://example.test/pixel.png)',
    );

    expect(rendered.resources).toEqual([
      {
        occurrence: 0,
        target: 'assets/image.png',
        kind: 'image',
        altText: 'locale',
      },
    ]);
    expect(rendered.diagnostics).toContainEqual({
      code: 'remote_image_blocked',
      message: 'Image distante non chargée.',
    });
    expect(rendered.html).not.toMatch(/<img|src=/);
  });

  it('ne partage aucun compteur entre deux documents', () => {
    expect(renderMarkdown('# Même').headings[0]?.id).toBe('mdv-heading-même');
    expect(renderMarkdown('# Même').headings[0]?.id).toBe('mdv-heading-même');
  });

  it('rend les extensions L13 sans rendre les tâches éditables', () => {
    const rendered = renderMarkdown(`
- [x] Terminée
- [ ] À faire

Une note[^a].

[^a]: Texte de note.

> [!WARNING]
> Attention.
`);

    expect(rendered.html).toContain('type="checkbox"');
    expect(rendered.html).toContain('disabled');
    expect(rendered.html).toContain('footnote');
    expect(rendered.html).toContain('markdown-alert-warning');
  });
});
