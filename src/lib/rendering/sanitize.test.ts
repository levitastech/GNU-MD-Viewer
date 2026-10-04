// @vitest-environment jsdom

import { describe, expect, it } from 'vitest';

import { renderKatex } from './katex';
import {
  asUnsanitizedHtml,
  sanitizeDocumentHtml,
  sanitizeMermaidSvg,
} from './sanitize';

describe('profils de sanitisation L04', () => {
  it('neutralise le HTML actif et toutes les URL avant insertion', () => {
    const clean = sanitizeDocumentHtml(
      asUnsanitizedHtml(`
        <h1 id="ui-shell">Titre</h1>
        <a href="https://example.test" target="_blank">lien</a>
        <img src="https://example.test/pixel.png" onerror="alert(1)">
        <style>body { display: none }</style>
        <script>alert(1)</script>
      `),
    );

    expect(clean).toContain('<h1>Titre</h1>');
    expect(clean).toContain('<a>lien</a>');
    expect(clean).not.toMatch(/href|src|onerror|<style|<script|ui-shell/i);
  });

  it('réduit le SVG Mermaid au profil passif retenu', () => {
    const clean = sanitizeMermaidSvg(
      asUnsanitizedHtml(`
        <svg viewBox="0 0 100 20">
          <style>@import url(https://example.test/a.css)</style>
          <foreignObject><button onclick="alert(1)">X</button></foreignObject>
          <image href="https://example.test/pixel.png" />
          <a href="javascript:alert(1)"><text x="1" y="10">lien</text></a>
          <path d="M0 0L10 10" stroke="black" />
        </svg>
      `),
    );

    expect(clean).toContain('<path d="M0 0L10 10" stroke="black"></path>');
    expect(clean).not.toMatch(
      /foreignObject|button|image|javascript|https:|style|<a/i,
    );
  });

  it('rend KaTeX avec trust=false puis retire toute URL', () => {
    const normal = renderKatex(String.raw`c = \sqrt{a^2+b^2}`, false);
    const hostile = renderKatex(
      String.raw`\href{javascript:alert(1)}{attaque}`,
      false,
    );

    expect(normal.status).toBe('rendered');
    expect(hostile.status).toBe('rendered');
    if (hostile.status === 'rendered') {
      const container = document.createElement('div');
      container.innerHTML = hostile.html;
      expect(
        container.querySelector('[href], [src], [xlink\\:href]'),
      ).toBeNull();
      expect(container.textContent).toContain('javascript:alert(1)');
    }
  });

  it('retourne un fallback sans interpoler le message KaTeX', () => {
    const source = String.raw`\frac{<script>alert(1)</script>}`;
    expect(renderKatex(source, false)).toEqual({
      status: 'fallback',
      source,
      message: 'Expression mathématique invalide ou non autorisée.',
    });
  });
});
