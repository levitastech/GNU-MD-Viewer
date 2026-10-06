<script lang="ts">
  import type {
    DeclaredResource,
    DocumentId,
    ResourceService,
    SafeHtml,
    SessionId,
  } from '../contracts/document';
  import { hydrateLocalImages } from '../rendering/hydrate-local-images';

  interface Props {
    html: SafeHtml;
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
    onsection(null);
    const headings = Array.from(
      documentElement.querySelectorAll<HTMLElement>('[data-mdv-heading]'),
    );
    if (typeof window.IntersectionObserver === 'undefined') return;
    // Internal observer bookkeeping, not reactive UI state.
    // eslint-disable-next-line svelte/prefer-svelte-reactivity
    const visible = new Set<Element>();
    const observer = new window.IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) visible.add(entry.target);
          else visible.delete(entry.target);
        }
        const heading = headings.find((element) => visible.has(element));
        if (heading) onsection(heading.dataset.mdvHeading ?? null);
      },
      {
        root: documentElement.closest('.reader'),
        rootMargin: '0px 0px -60% 0px',
      },
    );
    for (const heading of headings) observer.observe(heading);
    return () => observer.disconnect();
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
