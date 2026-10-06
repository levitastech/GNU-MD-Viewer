// @vitest-environment jsdom

import { describe, expect, it, vi } from 'vitest';

import type { ResourceService } from '../contracts/document';
import {
  toDocumentId,
  toResourceToken,
  toSessionId,
} from '../contracts/document';
import { hydrateLocalImages } from './hydrate-local-images';

const image = {
  occurrence: 0,
  target: 'assets/image.png',
  kind: 'image' as const,
  altText: 'Une image locale',
};

const resourceService = (): ResourceService => ({
  resolve: vi.fn(async () => ({
    token: toResourceToken('a'.repeat(64)),
    url: 'gnu-mdv-resource://localhost/token',
    mime: 'image/png' as const,
    encodedBytes: 10,
    width: 4,
    height: 5,
  })),
  releaseSession: vi.fn(async () => undefined),
});

describe('hydratation des images locales L10', () => {
  it('remplace uniquement le placeholder par une URL à jeton validée par Rust', async () => {
    const documentElement = document.createElement('article');
    documentElement.innerHTML = '<span data-mdv-image="0">Image</span>';
    document.body.append(documentElement);
    const service = resourceService();

    await hydrateLocalImages({
      documentElement,
      documentId: toDocumentId('document-a'),
      isCurrent: () => true,
      resources: [image],
      resourceService: service,
      sessionId: toSessionId('session-a'),
    });

    expect(service.resolve).toHaveBeenCalledWith({
      sessionId: toSessionId('session-a'),
      documentId: toDocumentId('document-a'),
      target: 'assets/image.png',
      expectedKind: 'image',
    });
    expect(documentElement.querySelector('img')).toMatchObject({
      alt: 'Une image locale',
      src: 'gnu-mdv-resource://localhost/token',
      width: 4,
      height: 5,
    });
    documentElement.remove();
  });

  it('ne modifie pas un rendu devenu périmé', async () => {
    const documentElement = document.createElement('article');
    documentElement.innerHTML = '<span data-mdv-image="0">Image</span>';
    document.body.append(documentElement);

    await hydrateLocalImages({
      documentElement,
      documentId: toDocumentId('document-a'),
      isCurrent: () => false,
      resources: [image],
      resourceService: resourceService(),
      sessionId: toSessionId('session-a'),
    });

    expect(documentElement.querySelector('img')).toBeNull();
    expect(documentElement.textContent).toBe('Image');
    documentElement.remove();
  });
});
