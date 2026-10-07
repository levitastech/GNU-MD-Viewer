import type { SafeHtml } from '../contracts/document';
import { checkEnrichmentBudget } from './enrichment-budget';
import { asUnsanitizedHtml, sanitizeCodeHtml } from './sanitize';

const aliases: Readonly<Record<string, string>> = {
  js: 'javascript',
  javascript: 'javascript',
  ts: 'typescript',
  typescript: 'typescript',
  json: 'json',
  html: 'xml',
  xml: 'xml',
  css: 'css',
  sh: 'bash',
  shell: 'bash',
  bash: 'bash',
  py: 'python',
  python: 'python',
  rs: 'rust',
  rust: 'rust',
};
let library:
  Promise<(typeof import('highlight.js/lib/core'))['default']> | undefined;
const load = () =>
  (library ??= (async () => {
    const [{ default: core }, js, ts, json, xml, css, bash, python, rust] =
      await Promise.all([
        import('highlight.js/lib/core'),
        import('highlight.js/lib/languages/javascript'),
        import('highlight.js/lib/languages/typescript'),
        import('highlight.js/lib/languages/json'),
        import('highlight.js/lib/languages/xml'),
        import('highlight.js/lib/languages/css'),
        import('highlight.js/lib/languages/bash'),
        import('highlight.js/lib/languages/python'),
        import('highlight.js/lib/languages/rust'),
      ]);
    const instance = core.newInstance();
    for (const [name, language] of Object.entries({
      javascript: js,
      typescript: ts,
      json,
      xml,
      css,
      bash,
      python,
      rust,
    }))
      instance.registerLanguage(name, language.default);
    return instance;
  })());

// Owned by one document enrichment pass; never retained between sessions.
export class DocumentHighlighter {
  private cache = new Map<string, SafeHtml>();
  private bytes = 0;
  async highlight(source: string, alias: string): Promise<SafeHtml | null> {
    const language = aliases[alias.toLowerCase()];
    if (!language || !checkEnrichmentBudget('code', source).accepted)
      return null;
    const key = `11.12.0\u0000${language}\u0000${source}`;
    const cached = this.cache.get(key);
    if (cached !== undefined) return cached;
    try {
      const hljs = await load();
      const html = sanitizeCodeHtml(
        asUnsanitizedHtml(
          hljs.highlight(source, { language, ignoreIllegals: true }).value,
        ),
      );
      const cost = 2 * (key.length + html.length);
      if (cost <= 2_000_000) {
        while (this.cache.size >= 32 || this.bytes + cost > 2_000_000) {
          const oldest = this.cache.keys().next().value;
          if (oldest === undefined) break;
          this.bytes -= 2 * (oldest.length + this.cache.get(oldest)!.length);
          this.cache.delete(oldest);
        }
        this.cache.set(key, html);
        this.bytes += cost;
      }
      return html;
    } catch {
      return null;
    }
  }
  clear(): void {
    this.cache.clear();
    this.bytes = 0;
  }
  get size(): number {
    return this.cache.size;
  }
}
