import type { DocumentHighlighter } from './highlight';
import type { EnrichmentBlock } from '../contracts/document';
import { replaceWithSafeHtml } from './sanitize';

let generation = 0;
export const enrichDocument = async (
  root: HTMLElement,
  blocks: readonly EnrichmentBlock[],
  dark: boolean,
  signal: AbortSignal,
): Promise<void> => {
  const current = ++generation;
  let highlighter: DocumentHighlighter | undefined;
  try {
    for (const block of blocks) {
      if (signal.aborted) return;
      const target = root.querySelector<HTMLElement>(
        `[data-mdv-enrichment="${block.occurrence}"]`,
      );
      if (!target) continue;
      try {
        if (block.kind === 'code') {
          const { DocumentHighlighter } = await import('./highlight');
          if (signal.aborted) return;
          highlighter ??= new DocumentHighlighter();
          const highlighted = await highlighter.highlight(
            block.source,
            block.language ?? '',
          );
          if (signal.aborted) return;
          if (highlighted !== null) {
            replaceWithSafeHtml(target, highlighted);
            if (target.textContent !== block.source)
              target.textContent = block.source;
          }
          continue;
        }
        if (block.kind === 'katex-inline' || block.kind === 'katex-block') {
          const { renderKatex } = await import('./katex');
          if (signal.aborted) return;
          const result = renderKatex(
            block.source,
            block.kind === 'katex-block',
          );
          if (result.status === 'rendered')
            replaceWithSafeHtml(target, result.html);
          else {
            target.textContent = `${result.message} ${block.source}`;
          }
          continue;
        }
        if (block.kind !== 'mermaid') continue;
        const { renderMermaid } = await import('./mermaid');
        if (signal.aborted) return;
        const result = await renderMermaid(
          block.source,
          `mdv-diagram-${current}-${block.occurrence}`,
          dark,
        );
        if (signal.aborted) return;
        if (result.status === 'rendered')
          replaceWithSafeHtml(target, result.svg);
        else {
          const pre = document.createElement('pre');
          pre.textContent = block.source;
          const notice = document.createElement('p');
          notice.textContent = result.message;
          target.replaceChildren(notice, pre);
        }
      } catch {
        if (!signal.aborted) target.textContent = block.source;
      }
    }
  } finally {
    highlighter?.clear();
  }
};
