import type { SafeHtml } from '../contracts/document';
import { LIMITS } from '../contracts/limits';
import { checkEnrichmentBudget } from './enrichment-budget';
import { asUnsanitizedHtml, sanitizeMermaidSvg } from './sanitize';

export type MermaidResult =
  | { readonly status: 'rendered'; readonly svg: SafeHtml }
  | {
      readonly status: 'fallback';
      readonly source: string;
      readonly message: string;
    };

import { EnrichmentScheduler } from './enrichment-scheduler';
const scheduler = new EnrichmentScheduler(1);
const SUPPORTED_DIAGRAM_TYPES = new Set([
  'flowchart',
  'flowchart-v2',
  'sequence',
]);

export const renderMermaid = async (
  source: string,
  uniqueId: string,
  dark = false,
): Promise<MermaidResult> => {
  const budget = checkEnrichmentBudget('mermaid', source);
  if (!budget.accepted) {
    return { status: 'fallback', source, message: budget.message };
  }

  if (/%%\{|^\s*---|\bclick\s|https?:|<\s*[a-zA-Z!/]/m.test(source)) {
    return {
      status: 'fallback',
      source,
      message: 'Directives, HTML et interactions Mermaid refusés.',
    };
  }
  return scheduler.schedule(async () => {
    try {
      const { default: mermaid } = await import('mermaid');

      {
        mermaid.initialize({
          theme: dark ? 'dark' : 'default',
          startOnLoad: false,
          securityLevel: 'strict',
          htmlLabels: false,
          maxTextSize: LIMITS.mermaidSourceCharacters,
          maxEdges: LIMITS.mermaidEdges,
          suppressErrorRendering: true,
          deterministicIds: true,
          secure: [
            'secure',
            'securityLevel',
            'startOnLoad',
            'maxTextSize',
            'maxEdges',
            'suppressErrorRendering',
            'htmlLabels',
            'theme',
            'themeCSS',
            'themeVariables',
            'fontFamily',
          ],
        });
      }

      const diagramType = mermaid.detectType(source);
      if (!SUPPORTED_DIAGRAM_TYPES.has(diagramType)) {
        return {
          status: 'fallback',
          source,
          message:
            'Cette famille de diagramme Mermaid n’est pas prise en charge.',
        };
      }

      const { svg } = await mermaid.render(uniqueId, source);
      return {
        status: 'rendered',
        svg: sanitizeMermaidSvg(asUnsanitizedHtml(svg)),
      };
    } catch (error) {
      const harnessDetail =
        import.meta.env.VITE_L04_HARNESS === '1' && error instanceof Error
          ? ` ${error.name}: ${error.message}`
          : '';
      return {
        status: 'fallback',
        source,
        message: `Diagramme Mermaid invalide ou non autorisé.${harnessDetail}`,
      };
    }
  });
};
