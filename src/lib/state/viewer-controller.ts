import type {
  AppError,
  DeclaredResource,
  DocumentId,
  DocumentService,
  HeadingEntry,
  SessionId,
  SafeHtml,
} from '../contracts/document';
import { sanitizeDocumentHtml } from '../rendering/sanitize';
import { splitDocumentLink } from '../rendering/document-link';
import { OpenCoordinator } from './open-coordinator';

export interface ViewerDocument {
  readonly initialAnchor?: string;
  readonly documentId: DocumentId;
  readonly sessionId: SessionId;
  readonly displayName: string;
  readonly html: SafeHtml;
  readonly headings: readonly HeadingEntry[];
  readonly resources: readonly DeclaredResource[];
  readonly headingCount: number;
  readonly diagnosticCount: number;
}

export interface ViewerState {
  readonly phase: 'empty' | 'opening' | 'ready';
  readonly active: ViewerDocument | null;
  readonly error: AppError | null;
  readonly ignoredPaths: number;
}

export const INITIAL_VIEWER_STATE: ViewerState = {
  phase: 'empty',
  active: null,
  error: null,
  ignoredPaths: 0,
};

type Listener = (state: ViewerState) => void;

export class ViewerController {
  private state: ViewerState = INITIAL_VIEWER_STATE;
  private readonly listeners = new Set<Listener>();
  private request = 0;

  constructor(
    private readonly documents: DocumentService,
    private readonly coordinator: OpenCoordinator,
  ) {}

  get current(): ViewerState {
    return this.state;
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    listener(this.state);
    return () => this.listeners.delete(listener);
  }

  async openFromDialog(extendRoot = false): Promise<void> {
    const session = this.state.active?.sessionId;
    if (extendRoot && !session) return;
    const request = ++this.request;
    this.update({
      ...this.state,
      phase: 'opening',
      error: null,
      ignoredPaths: 0,
    });

    try {
      const selection =
        extendRoot && session
          ? await this.documents.selectRoot(session)
          : await this.documents.selectDocument();
      if (request !== this.request) return;
      if (!selection) {
        this.update({
          ...this.state,
          phase: this.state.active ? 'ready' : 'empty',
        });
        return;
      }

      const outcome = await this.coordinator.open(selection);
      if (request !== this.request || outcome.status === 'superseded') return;

      if (outcome.status === 'failed') {
        this.update({
          ...this.state,
          phase: this.state.active ? 'ready' : 'empty',
          error: outcome.error,
        });
        return;
      }

      this.update({
        phase: 'ready',
        active: {
          documentId: outcome.active.snapshot.documentId,
          sessionId: outcome.active.snapshot.sessionId,
          displayName: outcome.active.snapshot.displayName,
          html: sanitizeDocumentHtml(outcome.active.render.html),
          headings: outcome.active.render.headings,
          resources: outcome.active.render.resources,
          headingCount: outcome.active.render.headings.length,
          diagnosticCount: outcome.active.render.diagnostics.length,
        },
        error: null,
        ignoredPaths: outcome.ignoredPaths,
      });
    } catch (error) {
      if (request !== this.request) return;
      this.update({
        ...this.state,
        phase: this.state.active ? 'ready' : 'empty',
        error: normalizeError(error),
      });
    }
  }

  async close(): Promise<void> {
    ++this.request;
    await this.coordinator.close();
    this.update(INITIAL_VIEWER_STATE);
  }

  async openRelative(target: string): Promise<void> {
    const active = this.coordinator.active;
    if (!active) return;
    const request = ++this.request;
    this.update({ ...this.state, phase: 'opening', error: null });
    try {
      const { path, anchor } = splitDocumentLink(target);
      const selection = await this.documents.selectRelative(
        active.snapshot.sessionId,
        path,
      );
      if (request !== this.request) return;
      const outcome = await this.coordinator.open(selection);
      if (request !== this.request || outcome.status === 'superseded') return;
      if (outcome.status === 'failed') {
        this.update({
          ...this.state,
          phase: this.state.active ? 'ready' : 'empty',
          error: outcome.error,
        });
        return;
      }
      this.update({
        phase: 'ready',
        active: {
          initialAnchor: anchor,
          documentId: outcome.active.snapshot.documentId,
          sessionId: outcome.active.snapshot.sessionId,
          displayName: outcome.active.snapshot.displayName,
          html: sanitizeDocumentHtml(outcome.active.render.html),
          headings: outcome.active.render.headings,
          resources: outcome.active.render.resources,
          headingCount: outcome.active.render.headings.length,
          diagnosticCount: outcome.active.render.diagnostics.length,
        },
        error: null,
        ignoredPaths: outcome.ignoredPaths,
      });
    } catch (error) {
      if (request !== this.request) return;
      this.update({
        ...this.state,
        phase: this.state.active ? 'ready' : 'empty',
        error: normalizeError(error),
      });
    }
  }

  dismissError(): void {
    this.update({ ...this.state, error: null });
  }

  private update(state: ViewerState): void {
    this.state = state;
    for (const listener of this.listeners) listener(state);
  }
}

const normalizeError = (error: unknown): AppError => {
  if (
    error &&
    typeof error === 'object' &&
    'code' in error &&
    'message' in error &&
    typeof error.code === 'string' &&
    typeof error.message === 'string'
  ) {
    return error as AppError;
  }
  return {
    code: 'access_denied',
    message: "L'ouverture du document a échoué.",
  };
};
