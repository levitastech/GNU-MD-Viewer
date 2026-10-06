<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import type { Component } from 'svelte';
  import type { ResourceService } from './lib/contracts/document';

  import { APP_NAME, APP_VERSION, BOOTSTRAP_MESSAGE } from './lib/app/metadata';
  import ActionBar from './lib/components/ActionBar.svelte';
  import DocumentView from './lib/components/DocumentView.svelte';
  import TableOfContents from './lib/components/TableOfContents.svelte';
  import type { HeadingEntry } from './lib/contracts/document';
  import { MarkdownRenderService } from './lib/markdown/engine';
  import { navigateDocument } from './lib/rendering/document-navigation';
  import { TauriDocumentService } from './lib/platform/tauri-document-service';
  import {
    isExternalHttpUrl,
    TauriExternalLinkService,
  } from './lib/platform/tauri-link-service';
  import { TauriResourceService } from './lib/platform/tauri-resource-service';
  import { OpenCoordinator } from './lib/state/open-coordinator';
  import {
    INITIAL_VIEWER_STATE,
    ViewerController,
    type ViewerState,
  } from './lib/state/viewer-controller';

  let Harness: Component | null = null;
  let state: ViewerState = INITIAL_VIEWER_STATE;
  let controller: ViewerController | null = null;
  let unsubscribe: (() => void) | null = null;
  let linkNotice = '';
  let theme: 'light' | 'dark' = 'light';
  let zoom = 100;
  let activeSection: string | null = null;
  const links = new TauriExternalLinkService();
  const resources: ResourceService = new TauriResourceService();

  onMount(async () => {
    if (import.meta.env.VITE_L04_HARNESS === '1') {
      Harness = (await import('./lib/platform/L04WebviewHarness.svelte'))
        .default;
      return;
    }
    if (import.meta.env.VITE_L09_HARNESS === '1') {
      Harness = (await import('./lib/platform/L09WebviewHarness.svelte'))
        .default;
      return;
    }

    const documents = new TauriDocumentService();
    const coordinator = new OpenCoordinator(
      documents,
      new MarkdownRenderService(),
      resources,
    );
    controller = new ViewerController(documents, coordinator);
    unsubscribe = controller.subscribe((next) => {
      state = next;
    });
  });

  onDestroy(() => {
    unsubscribe?.();
    void controller?.close();
  });

  const openDocument = (): void => {
    linkNotice = '';
    void controller?.openFromDialog();
  };

  const closeDocument = (): void => {
    linkNotice = '';
    void controller?.close();
  };

  const changeZoom = (delta: number): void => {
    zoom = Math.min(200, Math.max(80, zoom + delta));
  };

  const toggleTheme = (): void => {
    theme = theme === 'light' ? 'dark' : 'light';
  };

  const activateLink = (element: HTMLElement): void => {
    const target = element.dataset.mdvLink ?? '';
    const kind = element.dataset.mdvLinkKind;
    if (kind !== 'external' || !isExternalHttpUrl(target)) {
      if (kind === 'local' && target.startsWith('#')) {
        const container = document.querySelector<HTMLElement>('.document');
        linkNotice =
          container && navigateDocument(container, target)
            ? ''
            : 'Section introuvable.';
        return;
      }
      if (kind === 'local' && !target.startsWith('#')) {
        void controller?.openRelative(target).catch((error: unknown) => {
          linkNotice =
            error instanceof Error ? error.message : 'Lien local refusé.';
        });
        return;
      }
      linkNotice =
        kind === 'local'
          ? 'Ancre locale introuvable.'
          : 'Ce lien a été refusé par la politique de sécurité.';
      return;
    }
    if (
      !window.confirm(
        `Ouvrir ce lien dans le navigateur système ?\n\n${target}`,
      )
    ) {
      return;
    }
    void links.open(target).catch((error: unknown) => {
      linkNotice =
        error && typeof error === 'object' && 'message' in error
          ? String(error.message)
          : "Le lien externe n'a pas pu être ouvert.";
    });
  };

  const navigateToHeading = (heading: HeadingEntry): void => {
    const container = document.querySelector<HTMLElement>('.document');
    if (container && navigateDocument(container, `#${heading.id}`))
      activeSection = heading.id;
  };
</script>

<svelte:head>
  <title>{APP_NAME}</title>
</svelte:head>

{#if Harness}
  <Harness />
{:else}
  <div
    class:theme-dark={theme === 'dark'}
    class="viewer-shell"
    aria-busy={state.phase === 'opening'}
    style:--reader-zoom={`${zoom}%`}
  >
    <ActionBar
      title={state.active?.displayName ?? null}
      busy={state.phase === 'opening'}
      onopen={openDocument}
      onclose={closeDocument}
      ontheme={toggleTheme}
      onzoom={changeZoom}
    />

    {#if state.error}
      <aside class="notice error-notice" role="alert">
        <span>{state.error.message}</span>
        <button type="button" onclick={() => controller?.dismissError()}
          >Fermer</button
        >
      </aside>
    {/if}
    {#if linkNotice}
      <aside class="notice" role="status">{linkNotice}</aside>
    {/if}

    <main class="reader" id="app-title">
      {#if state.active}
        <TableOfContents
          headings={state.active.headings}
          onselect={navigateToHeading}
          active={activeSection}
        />
        <DocumentView
          html={state.active.html}
          documentId={state.active.documentId}
          label={state.active.displayName}
          onactivate={activateLink}
          resources={state.active.resources}
          resourceService={resources}
          sessionId={state.active.sessionId}
          onsection={(id) => {
            activeSection = id;
          }}
        />
      {:else}
        <section class="empty-state">
          <p class="eyebrow">Lecteur Markdown hors ligne</p>
          <h1>{APP_NAME}</h1>
          <p>{BOOTSTRAP_MESSAGE}</p>
          <button
            type="button"
            class="primary empty-action"
            onclick={openDocument}
          >
            Choisir un document Markdown
          </button>
          <p class="version">Version {APP_VERSION} — non publiée</p>
        </section>
      {/if}
    </main>
  </div>
{/if}
