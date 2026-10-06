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

  const activateLink = (element: HTMLElement): void => {
    const target = element.dataset.mdvLink ?? '';
    const kind = element.dataset.mdvLinkKind;
    if (kind !== 'external' || !isExternalHttpUrl(target)) {
      linkNotice =
        kind === 'local'
          ? 'La navigation Markdown locale sera activée avec le service de ressources L10.'
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
    document
      .querySelector<HTMLElement>(`[data-mdv-heading="${heading.id}"]`)
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
</script>

<svelte:head>
  <title>{APP_NAME}</title>
</svelte:head>

{#if Harness}
  <Harness />
{:else}
  <div class="viewer-shell" aria-busy={state.phase === 'opening'}>
    <ActionBar
      title={state.active?.displayName ?? null}
      busy={state.phase === 'opening'}
      onopen={openDocument}
      onclose={closeDocument}
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
        />
        <DocumentView
          html={state.active.html}
          documentId={state.active.documentId}
          label={state.active.displayName}
          onactivate={activateLink}
          resources={state.active.resources}
          resourceService={resources}
          sessionId={state.active.sessionId}
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
