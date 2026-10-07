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
  for (const block of blocks) {
    if (signal.aborted) return;
    const target = root.querySelector<HTMLElement>(
      `[data-mdv-enrichment="${block.occurrence}"]`,
    );
    if (!target) continue;
    try {
      if (block.kind !== 'mermaid') continue;
      const { renderMermaid } = await import('./mermaid');
      if (signal.aborted) return;
      const result = await renderMermaid(
        block.source,
        `mdv-diagram-${current}-${block.occurrence}`,
        dark,
      );
      if (signal.aborted) return;
      if (result.status === 'rendered') replaceWithSafeHtml(target, result.svg);
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
};
