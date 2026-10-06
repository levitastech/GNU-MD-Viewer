import { describe, expect, it } from 'vitest';
import { splitDocumentLink } from './document-link';

describe('liens inter-documents L10', () => {
  it('sépare avant décodage sans confondre nom et fragment', () => {
    expect(splitDocumentLink('sub/été%20%23.md#%C3%A9t%C3%A9')).toEqual({
      path: 'sub/été%20%23.md',
      anchor: '#%C3%A9t%C3%A9',
    });
    expect(splitDocumentLink('a.md#')).toEqual({
      path: 'a.md',
      anchor: undefined,
    });
    expect(splitDocumentLink('a%2523.md').path).toBe('a%2523.md');
  });
  it('refuse query et encodage de fragment invalide avant ouverture', () => {
    for (const target of ['a.md?x', 'a.md#%FF', 'a.md#%', '#local']) {
      expect(() => splitDocumentLink(target)).toThrow();
    }
  });
});
