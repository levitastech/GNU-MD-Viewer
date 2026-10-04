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

let initialized = false;

const SUPPORTED_DIAGRAM_TYPES = new Set([
  'class',
  'classDiagram',
  'er',
  'flowchart',
  'flowchart-elk',
  'flowchart-v2',
  'gantt',
  'pie',
  'sequence',
  'state',
  'stateDiagram',
]);

export const renderMermaid = async (
  source: string,
  uniqueId: string,
): Promise<MermaidResult> => {
  const budget = checkEnrichmentBudget('mermaid', source);
  if (!budget.accepted) {
    return { status: 'fallback', source, message: budget.message };
  }

  try {
    const { default: mermaid } = await import('mermaid');

    if (!initialized) {
      mermaid.initialize({
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
      initialized = true;
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
};
