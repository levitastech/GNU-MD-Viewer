import katex from 'katex';
import 'katex/dist/katex.min.css';

import { LIMITS } from '../contracts/limits';
import type { SafeHtml } from '../contracts/document';
import { checkEnrichmentBudget } from './enrichment-budget';
import { asUnsanitizedHtml, sanitizeKatexHtml } from './sanitize';

export type KatexResult =
  | { readonly status: 'rendered'; readonly html: SafeHtml }
  | {
      readonly status: 'fallback';
      readonly source: string;
      readonly message: string;
    };

export const renderKatex = (
  source: string,
  displayMode: boolean,
): KatexResult => {
  const budget = checkEnrichmentBudget('katex', source);
  if (!budget.accepted) {
    return { status: 'fallback', source, message: budget.message };
  }

  try {
    const html = katex.renderToString(source, {
      displayMode,
      output: 'htmlAndMathml',
      throwOnError: true,
      trust: false,
      strict: 'error',
      maxExpand: LIMITS.katexMaxExpand,
      maxSize: LIMITS.katexMaxSizeEm,
      globalGroup: false,
      macros: Object.create(null) as Record<string, string>,
    });

    return {
      status: 'rendered',
      html: sanitizeKatexHtml(asUnsanitizedHtml(html)),
    };
  } catch {
    return {
      status: 'fallback',
      source,
      message: 'Expression mathématique invalide ou non autorisée.',
    };
  }
};
