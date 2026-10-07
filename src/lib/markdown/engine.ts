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
  EnrichmentBlock,
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
  readonly headingIds: Set<string>;
  imageOccurrence: number;
  readonly enrichments: EnrichmentBlock[];
}

const collectInlineText = (token: Token): string => {
  if (token.type === 'softbreak' || token.type === 'hardbreak') return ' ';
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
    .toLowerCase()
    .trim()
    .replace(/[^\p{L}\p{N}\p{M}\s_-]/gu, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug || 'section';
};

const uniqueHeadingId = (
  value: string,
  counts: Map<string, number>,
  used: Set<string>,
): string => {
  const base = `mdv-heading-${slugBase(value)}`;
  let occurrence = counts.get(base) ?? 0;
  let id = occurrence === 0 ? base : `${base}-${occurrence}`;
  while (used.has(id)) id = `${base}-${++occurrence}`;
  counts.set(base, occurrence + 1);
  used.add(id);
  return id;
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
    const id = uniqueHeadingId(text, env.slugCounts, env.headingIds);
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

  // Keep the plugin's parser, but render inert markers instead of form controls.
  markdown.renderer.rules.todo_list_inline = (
    tokens,
    index,
    options,
    environment,
    renderer,
  ) => {
    const token = tokens[index]!;
    const checked = /^\[[xX]\] /.test(token.content);
    const children = token.children ?? [];
    if (children[0]) children[0].content = children[0].content.slice(3);
    return `<span class="mdv-task" role="img" aria-label="${checked ? 'Tâche terminée' : 'Tâche non terminée'}">${checked ? '☑' : '☐'}</span> ${renderer.renderInline(children, options, environment)}`;
  };

  const noteId = (token: Token): number => {
    const id = Number(token.meta?.id);
    if (!Number.isSafeInteger(id) || id < 0)
      throw new Error('Identifiant de note invalide.');
    return id + 1;
  };
  const referenceId = (token: Token): string =>
    `mdv-note-ref-${noteId(token)}-${Number(token.meta?.subId ?? 0)}`;
  const localLink = (
    target: string,
    label: string,
    accessibleLabel: string,
    anchor?: string,
  ): string =>
    `<a class="mdv-link" role="link" tabindex="0" data-mdv-link="#${target}" data-mdv-link-kind="local" aria-label="${accessibleLabel}"${anchor ? ` data-mdv-anchor="${anchor}"` : ''}>${label}</a>`;
  markdown.renderer.rules.footnote_ref = (tokens, index) => {
    const token = tokens[index]!;
    return `<sup class="footnote-ref">${localLink(`mdv-note-${noteId(token)}`, `[${noteId(token)}]`, `Lire la note ${noteId(token)}`, referenceId(token))}</sup>`;
  };
  markdown.renderer.rules.footnote_open = (tokens, index) =>
    `<li class="footnote-item" data-mdv-anchor="mdv-note-${noteId(tokens[index]!)}">`;
  markdown.renderer.rules.footnote_anchor = (tokens, index) =>
    localLink(
      referenceId(tokens[index]!),
      '↩',
      `Revenir au texte de la note ${noteId(tokens[index]!)}`,
    );

  const wrapCode: (fallback: RendererRule | undefined) => RendererRule =
    (fallback) => (tokens, index, options, environment, renderer) => {
      const token = tokens[index]!;
      const env = renderEnvironment(environment);
      if (token.info.trim() === 'mermaid') {
        const occurrence = env.enrichments.length;
        env.enrichments.push({
          occurrence,
          kind: 'mermaid',
          source: token.content,
        });
        return `<div class="mdv-mermaid" data-mdv-enrichment="${occurrence}"><pre><code>${markdown.utils.escapeHtml(token.content)}</code></pre></div>`;
      }
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
    headingIds: new Set(),
    imageOccurrence: 0,
    enrichments: [],
  };
  const html = markdown.render(source, environment);

  return {
    html: asUnsanitizedHtml(html),
    headings: environment.headings,
    resources: environment.resources,
    enrichments: environment.enrichments,
    diagnostics: environment.diagnostics,
  };
};

export class MarkdownRenderService implements RenderService {
  async render(snapshot: DocumentSnapshot): Promise<RenderResult> {
    return renderMarkdown(snapshot.text);
  }
}
