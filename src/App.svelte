<script lang="ts">
  import { onDestroy, onMount, tick } from 'svelte';
  import {
    TauriPreferenceService,
    type Recent,
  } from './lib/platform/tauri-preference-service';
  import { watchDocument } from './lib/state/watch-document';
  import {
    capturePosition,
    restorePosition,
  } from './lib/rendering/reading-position';
  import type { Component } from 'svelte';
  import type { ResourceService } from './lib/contracts/document';

  import { APP_NAME, APP_VERSION, BOOTSTRAP_MESSAGE } from './lib/app/metadata';
  import ActionBar from './lib/components/ActionBar.svelte';
  import DocumentView from './lib/components/DocumentView.svelte';
  import TableOfContents from './lib/components/TableOfContents.svelte';
  import type { HeadingEntry } from './lib/contracts/document';
  import { MarkdownRenderService } from './lib/markdown/engine';
  import { navigateDocument } from './lib/rendering/document-navigation';
  import {
    changeReadingZoom,
    isDarkTheme,
    observeSystemTheme,
    type ThemeMode,
  } from './lib/state/reading-preferences';
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
  let stopWatch: (() => void) | null = null;
  let watchedSession: string | null = null;
  let unsubscribe: (() => void) | null = null;
  let linkNotice = '';
  let theme: ThemeMode = 'system';
  let systemDark = false;
  let stopSystemTheme: (() => void) | null = null;
  let zoom = 100;
  let tocVisible = true;
  let recentFiles: readonly Recent[] = [];
  let preferenceNotice = '';
  let preferencesWritable = true;
  const preferences = new TauriPreferenceService();
  let saves: Promise<void> = Promise.resolve();
  const refreshRecents = async (): Promise<void> => {
    try {
      const view = await preferences.load();
      recentFiles = view.recents;
      preferenceNotice = view.notice ?? '';
      preferencesWritable = view.writable;
    } catch {
      preferenceNotice = 'Préférences locales indisponibles.';
    }
  };
  const persistReading = (): void => {
    const reading = { theme, zoom, tocVisible };
    saves = saves
      .then(() => preferences.save(reading))
      .catch(() => {
        preferenceNotice = 'Préférences non enregistrées.';
      });
  };
  const forgetRecent = async (id?: string): Promise<void> => {
    try {
      if (id) await preferences.forget(id);
      else await preferences.clear();
      await refreshRecents();
    } catch {
      preferenceNotice =
        'Historique non modifié : configuration inaccessible ou plus récente.';
    }
  };
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

    try {
      const view = await preferences.load();
      theme = view.reading.theme;
      zoom = view.reading.zoom;
      tocVisible = view.reading.tocVisible;
      recentFiles = view.recents;
      preferenceNotice = view.notice ?? '';
      preferencesWritable = view.writable;
    } catch {
      preferenceNotice = 'Préférences locales indisponibles.';
    }
    const documents = new TauriDocumentService();
    stopSystemTheme = observeSystemTheme(
      window.matchMedia('(prefers-color-scheme: dark)'),
      (dark) => {
        systemDark = dark;
      },
    );
    const coordinator = new OpenCoordinator(
      documents,
      new MarkdownRenderService(),
      resources,
    );
    controller = new ViewerController(documents, coordinator);
    unsubscribe = controller.subscribe((next) => {
      const previous = state.active;
      const position =
        next.active &&
        previous &&
        next.active.sessionId !== previous.sessionId &&
        next.active.displayName === previous.displayName
          ? capturePosition(document.querySelector<HTMLElement>('.reader'))
          : null;
      state = next;
      if (position)
        void tick().then(() =>
          restorePosition(
            document.querySelector<HTMLElement>('.reader'),
            position,
          ),
        );
      const session = next.active?.sessionId ?? null;
      if (session !== watchedSession) {
        stopWatch?.();
        watchedSession = session;
        if (session) void refreshRecents();
        stopWatch = session
          ? watchDocument(
              () =>
                controller!.current.phase === 'ready'
                  ? documents.poll(session)
                  : Promise.resolve(false),
              () => controller!.reload(),
              (error) => controller!.reportWatchError(error, session),
            )
          : null;
      }
    });
    if (import.meta.env.VITE_V4_HARNESS === '1') {
      const { runV4Recipe } = await import('./lib/platform/v4-webview-recipe');
      void runV4Recipe();
    }
    if (import.meta.env.VITE_V3_HARNESS === '1') {
      const { runV3Recipe } = await import('./lib/platform/v3-webview-recipe');
      void runV3Recipe();
    }
  });

  onDestroy(() => {
    stopWatch?.();
    stopSystemTheme?.();
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
    zoom = changeReadingZoom(zoom, delta);
    persistReading();
  };

  const selectTheme = (mode: ThemeMode): void => {
    theme = mode;
    persistReading();
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
        linkNotice = '';
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
    class:theme-dark={isDarkTheme(theme, systemDark)}
    class="viewer-shell"
    aria-busy={state.phase === 'opening'}
    style:--reader-zoom={`${zoom}%`}
  >
    <ActionBar
      title={state.active?.displayName ?? null}
      busy={state.phase === 'opening'}
      onopen={openDocument}
      onextend={() => {
        linkNotice = '';
        void controller?.openFromDialog(true);
      }}
      onclose={closeDocument}
      onreload={() => controller?.reload()}
      ontheme={selectTheme}
      onzoom={changeZoom}
      onresetzoom={() => {
        zoom = 100;
        persistReading();
      }}
      {theme}
      {zoom}
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

    {#if preferenceNotice}<aside class="notice" role="status">
        {preferenceNotice}
      </aside>{/if}
    {#if recentFiles.length > 0}
      <details class="recent-documents">
        <summary>Documents récents</summary>
        <ul>
          {#each recentFiles as recent (recent.id)}<li>
              <button
                type="button"
                class="open-recent"
                disabled={state.phase === 'opening'}
                onclick={() => controller?.openRecent(recent.id)}
                >{recent.label}</button
              >
              <button
                type="button"
                aria-label={`Retirer ${recent.label} des récents`}
                disabled={!preferencesWritable}
                onclick={() => forgetRecent(recent.id)}>Retirer</button
              >
            </li>{/each}
        </ul>
        <button
          type="button"
          class="clear-recents"
          disabled={!preferencesWritable}
          onclick={() => forgetRecent()}>Effacer l’historique</button
        >
      </details>
    {/if}
    <main class="reader" id="app-title">
      {#if state.active}
        <TableOfContents
          headings={state.active.headings}
          onselect={navigateToHeading}
          active={activeSection}
          visible={tocVisible}
          onvisible={(visible) => {
            tocVisible = visible;
            persistReading();
          }}
        />
        {#key state.active.sessionId}
          <DocumentView
            html={state.active.html}
            enrichments={state.active.enrichments}
            dark={isDarkTheme(theme, systemDark)}
            initialAnchor={state.active.initialAnchor}
            onanchorerror={() => {
              linkNotice = 'Section introuvable.';
            }}
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
        {/key}
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
