import { LIMITS } from '../contracts/limits';

export type EnrichmentKind = 'code' | 'katex' | 'mermaid';

export type BudgetResult =
  | { readonly accepted: true }
  | {
      readonly accepted: false;
      readonly code: 'source_too_large' | 'too_many_lines' | 'too_many_edges';
      readonly message: string;
    };

const utf8Size = (value: string): number =>
  new TextEncoder().encode(value).length;

const lineCount = (value: string): number => {
  if (value.length === 0) return 0;
  return value.split('\n').length;
};

const probableMermaidEdgeCount = (source: string): number => {
  const matches = source.match(/-->|---|-.->|==>|~~~|--o|--x/g);
  return matches?.length ?? 0;
};

export const checkEnrichmentBudget = (
  kind: EnrichmentKind,
  source: string,
): BudgetResult => {
  if (kind === 'code') {
    if (utf8Size(source) > LIMITS.codeSourceBytes) {
      return {
        accepted: false,
        code: 'source_too_large',
        message: 'Bloc de code trop volumineux pour la coloration.',
      };
    }

    if (lineCount(source) > LIMITS.codeLines) {
      return {
        accepted: false,
        code: 'too_many_lines',
        message: 'Bloc de code trop long pour la coloration.',
      };
    }

    return { accepted: true };
  }

  if (kind === 'katex') {
    return source.length <= LIMITS.katexSourceCharacters
      ? { accepted: true }
      : {
          accepted: false,
          code: 'source_too_large',
          message: 'Expression mathématique trop volumineuse.',
        };
  }

  if (source.length > LIMITS.mermaidSourceCharacters) {
    return {
      accepted: false,
      code: 'source_too_large',
      message: 'Diagramme Mermaid trop volumineux.',
    };
  }

  if (lineCount(source) > LIMITS.mermaidLines) {
    return {
      accepted: false,
      code: 'too_many_lines',
      message: 'Diagramme Mermaid trop complexe.',
    };
  }

  if (probableMermaidEdgeCount(source) > LIMITS.mermaidEdges) {
    return {
      accepted: false,
      code: 'too_many_edges',
      message: "Le nombre d'arêtes Mermaid dépasse la limite.",
    };
  }

  return { accepted: true };
};
