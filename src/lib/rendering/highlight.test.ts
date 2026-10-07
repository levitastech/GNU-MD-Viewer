// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { DocumentHighlighter } from './highlight';

describe('L14 coloration ciblée', () => {
  it('conserve exactement le texte, les alias et les chaînes hostiles', async () => {
    const highlighter = new DocumentHighlighter();
    for (const [language, source] of Object.entries({
      js: 'const x = "<script>bad</script>";\n',
      ts: 'const x: number = 2;',
      json: '{"clé": 1}',
      html: '<script>alert(1)</script>',
      css: 'p { color: red; }',
      sh: 'echo "$HOME"',
      py: 'print("عربي")',
      rs: 'fn main() {}',
    })) {
      const result = await highlighter.highlight(source, language);
      expect(result).not.toBeNull();
      const code = document.createElement('code');
      code.innerHTML = result!;
      expect(code.textContent).toBe(source);
      expect(code.querySelector('script, img, [href], [src]')).toBeNull();
      expect(code.querySelector('span')).not.toBeNull();
    }
  });
  it('borne cache et gros blocs et garde la langue inconnue en texte', async () => {
    const highlighter = new DocumentHighlighter();
    expect(await highlighter.highlight('x', 'inconnu')).toBeNull();
    expect(await highlighter.highlight('x'.repeat(1000001), 'js')).toBeNull();
    expect(await highlighter.highlight('\n'.repeat(50001), 'js')).toBeNull();
    for (let index = 0; index < 40; index++)
      await highlighter.highlight(`const value = ${index};`, 'js');
    expect(highlighter.size).toBeLessThanOrEqual(32);
    highlighter.clear();
    expect(highlighter.size).toBe(0);
  });
});
