import type {
  DeclaredResource,
  DocumentId,
  ResourceService,
  SessionId,
} from '../contracts/document';

interface HydrateLocalImagesInput {
  readonly documentElement: HTMLElement;
  readonly documentId: DocumentId;
  readonly isCurrent: () => boolean;
  readonly resources: readonly DeclaredResource[];
  readonly resourceService: ResourceService;
  readonly sessionId: SessionId;
}

export const hydrateLocalImages = async ({
  documentElement,
  documentId,
  isCurrent,
  resources,
  resourceService,
  sessionId,
}: HydrateLocalImagesInput): Promise<void> => {
  for (const resource of resources) {
    const placeholder = documentElement.querySelector<HTMLElement>(
      `[data-mdv-image="${resource.occurrence}"]`,
    );
    if (!placeholder) continue;

    try {
      const resolved = await resourceService.resolve({
        sessionId,
        documentId,
        target: resource.target,
        expectedKind: 'image',
      });
      if (!isCurrent() || !placeholder.isConnected) return;

      const image = document.createElement('img');
      image.alt = resource.altText;
      image.src = resolved.url;
      image.width = resolved.width;
      image.height = resolved.height;
      image.loading = 'lazy';
      image.decoding = 'async';
      image.className = 'mdv-local-image';
      image.addEventListener(
        'error',
        () => {
          image.replaceWith(
            document.createTextNode('Image locale indisponible.'),
          );
        },
        { once: true },
      );
      placeholder.replaceWith(image);
    } catch {
      if (!isCurrent() || !placeholder.isConnected) return;
      placeholder.textContent = 'Image locale indisponible.';
    }
  }
};
