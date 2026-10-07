<script lang="ts">
  import type {
    DeclaredResource,
    EnrichmentBlock,
    DocumentId,
    ResourceService,
    SafeHtml,
    SessionId,
  } from '../contracts/document';
  import { enrichDocument } from '../rendering/enrich-document';
  import { hydrateLocalImages } from '../rendering/hydrate-local-images';
  import { markAlertSemantics } from '../rendering/alert-semantics';
  import { navigateDocument } from '../rendering/document-navigation';
  import { observeActiveSection } from '../rendering/active-section';

  interface Props {
    html: SafeHtml;
    enrichments?: readonly EnrichmentBlock[];
    dark?: boolean;
    initialAnchor?: string;
    onanchorerror: () => void;
    label: string;
    onactivate: (target: HTMLElement) => void;
    documentId: DocumentId;
    resources: readonly DeclaredResource[];
    resourceService: ResourceService;
    sessionId: SessionId;
    onsection: (id: string | null) => void;
  }

  let {
    html,
    enrichments = [],
    dark = false,
    initialAnchor,
    onanchorerror,
    label,
    onactivate,
    documentId,
    resources,
    resourceService,
    sessionId,
    onsection,
  }: Props = $props();
  let documentElement: HTMLElement;
  let hydration = 0;

  const candidate = (event: Event): HTMLElement | null => {
    const target = event.target;
    return target instanceof Element
      ? (target.closest('[data-mdv-link]') as HTMLElement | null)
      : null;
  };

  const handleClick = (event: MouseEvent): void => {
    const target = candidate(event);
    if (!target) return;
    event.preventDefault();
    onactivate(target);
  };

  const handleKeydown = (event: KeyboardEvent): void => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    const target = candidate(event);
    if (!target) return;
    event.preventDefault();
    onactivate(target);
  };

  const hydrateImages = async (): Promise<void> => {
    const currentHydration = ++hydration;
    await hydrateLocalImages({
      documentElement,
      documentId,
      isCurrent: () => currentHydration === hydration,
      resources,
      resourceService,
      sessionId,
    });
  };

  $effect(() => {
    void html;
    void documentId;
    void resources;
    void sessionId;
    void hydrateImages();
    return () => {
      hydration += 1;
    };
  });

  $effect(() => {
    void html;
    const abort = new window.AbortController();
    void enrichDocument(documentElement, enrichments, dark, abort.signal);
    return () => abort.abort();
  });

  $effect(() => {
    void html;
    markAlertSemantics(documentElement);
    if (initialAnchor && !navigateDocument(documentElement, initialAnchor))
      onanchorerror();
    return observeActiveSection(documentElement, onsection);
  });
</script>

<!-- Event delegation is required because sanitized document links are inserted as inert HTML. -->
<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<article
  class="document"
  aria-label={label}
  bind:this={documentElement}
  tabindex="-1"
  onclick={handleClick}
  onkeydown={handleKeydown}
>
  {@html html}
</article>
