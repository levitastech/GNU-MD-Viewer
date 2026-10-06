import MarkdownIt from 'markdown-it';
import footnote from 'markdown-it-footnote';
import githubAlerts from 'markdown-it-github-alerts';
import todoLists from 'markdown-it-todo-lists';
import type {
  Env,
  MarkdownIt as MarkdownItInstance,
  RendererRule,
  Token,
} from 'markdown-it';

import type {
  DeclaredResource,
  DocumentSnapshot,
  HeadingEntry,
  RenderDiagnostic,
  RenderResult,
  RenderService,
  SourcePosition,
} from '../contracts/document';
import { asUnsanitizedHtml } from '../rendering/sanitize';

interface RenderEnvironment extends Env {
  readonly headings: HeadingEntry[];
  readonly resources: DeclaredResource[];
  readonly diagnostics: RenderDiagnostic[];
  readonly lineOffsets: readonly number[];
  readonly slugCounts: Map<string, number>;
  imageOccurrence: number;
}

const collectInlineText = (token: Token): string => {
  if (token.type === 'text' || token.type === 'code_inline')
    return token.content;
  return token.children?.map(collectInlineText).join('') ?? token.content;
};

const lineOffsets = (source: string): number[] => {
  const offsets = [0];
  for (let index = 0; index < source.length; index += 1) {
    if (source[index] === '\n') offsets.push(index + 1);
  }
  return offsets;
};

const positionFor = (
  token: Token,
  offsets: readonly number[],
): SourcePosition => {
  const zeroBasedLine = token.map?.[0] ?? 0;
  return {
    line: zeroBasedLine + 1,
    column: 1,
    offset: offsets[zeroBasedLine] ?? 0,
  };
};

const slugBase = (value: string): string => {
  const slug = value
    .normalize('NFC')
    .toLocaleLowerCase()
    .trim()
    .replace(/[^\p{L}\p{N}\p{M}\s_-]/gu, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug || 'section';
};

const uniqueHeadingId = (
  value: string,
  counts: Map<string, number>,
): string => {
  const base = `mdv-heading-${slugBase(value)}`;
  const occurrence = counts.get(base) ?? 0;
  counts.set(base, occurrence + 1);
  return occurrence === 0 ? base : `${base}-${occurrence}`;
};

const classifyLink = (target: string): 'external' | 'local' | 'blocked' => {
  if (target.startsWith('#')) return 'local';
  try {
    const url = new URL(target);
    return url.protocol === 'http:' || url.protocol === 'https:'
      ? 'external'
      : 'blocked';
  } catch {
    return target.includes(':') || target.startsWith('//')
      ? 'blocked'
      : 'local';
  }
};

const renderEnvironment = (environment: Env | undefined): RenderEnvironment => {
  if (!environment) throw new Error('Contexte de rendu Markdown absent.');
  return environment as RenderEnvironment;
};

const installRendererRules = (markdown: MarkdownItInstance): void => {
  const defaultFence = markdown.renderer.rules.fence;
  const defaultCodeBlock = markdown.renderer.rules.code_block;

  markdown.renderer.rules.heading_open = (
    tokens,
    index,
    options,
    environment,
    renderer,
  ) => {
    const env = renderEnvironment(environment);
    const token = tokens[index]!;
    const inline = tokens[index + 1];
    const text = inline ? collectInlineText(inline) : '';
    const level = Number(token.tag.slice(1)) as HeadingEntry['level'];
    const id = uniqueHeadingId(text, env.slugCounts);
    token.attrSet('data-mdv-heading', id);
    env.headings.push({
      id,
      level,
      text,
      position: positionFor(token, env.lineOffsets),
    });
    return renderer.renderToken(tokens, index, options);
  };

  markdown.renderer.rules.link_open = (
    tokens,
    index,
    options,
    environment,
    renderer,
  ) => {
    const env = renderEnvironment(environment);
    const token = tokens[index]!;
    const target = String(token.attrGet('href') ?? '');
    const kind = classifyLink(target);
    token.attrSet('class', `mdv-link mdv-link-${kind}`);
    token.attrSet('data-mdv-link', target);
    token.attrSet('data-mdv-link-kind', kind);
    token.attrSet('role', 'link');
    token.attrSet('tabindex', '0');
    token.attrSet('href', '');
    if (kind === 'blocked') {
      env.diagnostics.push({
        code: 'link_protocol_blocked',
        message: `Protocole de lien refusé : ${target}`,
      });
    }
    return renderer.renderToken(tokens, index, options);
  };

  markdown.renderer.rules.image = (tokens, index, _options, environment) => {
    const env = renderEnvironment(environment);
    const token = tokens[index]!;
    const target = String(token.attrGet('src') ?? '');
    const altText = token.content;
    const occurrence = env.imageOccurrence++;
    const kind = classifyLink(target);
    if (kind === 'local' && !target.startsWith('#')) {
      env.resources.push({ occurrence, target, kind: 'image', altText });
    } else {
      env.diagnostics.push({
        code:
          kind === 'external' ? 'remote_image_blocked' : 'image_target_blocked',
        message:
          kind === 'external'
            ? 'Image distante non chargée.'
            : 'Référence d’image non prise en charge.',
      });
    }
    return `<span class="mdv-image-placeholder" data-mdv-image="${occurrence}">Image : ${markdown.utils.escapeHtml(altText || target)}</span>`;
  };

  const wrapCode: (fallback: RendererRule | undefined) => RendererRule =
    (fallback) => (tokens, index, options, environment, renderer) => {
      const token = tokens[index]!;
      const env = renderEnvironment(environment);
      env.diagnostics.push({
        code: 'code_pending_highlight',
        message: 'Bloc de code rendu sans coloration syntaxique.',
        position: positionFor(token, env.lineOffsets),
      });
      return fallback
        ? fallback(tokens, index, options, environment, renderer)
        : renderer.renderToken(tokens, index, options);
    };
  markdown.renderer.rules.fence = wrapCode(defaultFence);
  markdown.renderer.rules.code_block = wrapCode(defaultCodeBlock);
};

export const renderMarkdown = (source: string): RenderResult => {
  const markdown = new MarkdownIt('default', {
    html: false,
    breaks: false,
    linkify: true,
    typographer: false,
  });
  markdown.use(todoLists, { enabled: false });
  markdown.use(footnote as never);
  markdown.use(githubAlerts);
  installRendererRules(markdown);

  const environment: RenderEnvironment = {
    headings: [],
    resources: [],
    diagnostics: [],
    lineOffsets: lineOffsets(source),
    slugCounts: new Map(),
    imageOccurrence: 0,
  };
  const html = markdown.render(source, environment);

  return {
    html: asUnsanitizedHtml(html),
    headings: environment.headings,
    resources: environment.resources,
    enrichments: [],
    diagnostics: environment.diagnostics,
  };
};

export class MarkdownRenderService implements RenderService {
  async render(snapshot: DocumentSnapshot): Promise<RenderResult> {
    return renderMarkdown(snapshot.text);
  }
}
