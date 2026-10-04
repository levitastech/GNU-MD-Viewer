import { describe, expect, it } from 'vitest';

import { LIMITS } from '../contracts/limits';
import { checkEnrichmentBudget } from './enrichment-budget';

describe('plafonds préventifs des enrichisseurs', () => {
  it('accepte la borne KaTeX et refuse borne + 1', () => {
    expect(
      checkEnrichmentBudget('katex', 'x'.repeat(LIMITS.katexSourceCharacters)),
    ).toEqual({ accepted: true });
    expect(
      checkEnrichmentBudget(
        'katex',
        'x'.repeat(LIMITS.katexSourceCharacters + 1),
      ),
    ).toMatchObject({ accepted: false, code: 'source_too_large' });
  });

  it('borne séparément octets et lignes de code', () => {
    expect(
      checkEnrichmentBudget('code', 'a'.repeat(LIMITS.codeSourceBytes)),
    ).toEqual({ accepted: true });
    expect(
      checkEnrichmentBudget('code', 'é'.repeat(LIMITS.codeSourceBytes / 2 + 1)),
    ).toMatchObject({ accepted: false, code: 'source_too_large' });
    expect(
      checkEnrichmentBudget('code', '\n'.repeat(LIMITS.codeLines)),
    ).toMatchObject({ accepted: false, code: 'too_many_lines' });
  });

  it('refuse un graphe Mermaid à 501 arêtes avant import du moteur', () => {
    const accepted = Array.from(
      { length: LIMITS.mermaidEdges },
      (_, index) => `N${index} --> N${index + 1}`,
    ).join('\n');
    const refused = `${accepted}\nN501 --> N502`;

    expect(checkEnrichmentBudget('mermaid', accepted)).toEqual({
      accepted: true,
    });
    expect(checkEnrichmentBudget('mermaid', refused)).toMatchObject({
      accepted: false,
      code: 'too_many_edges',
    });
  });
});
