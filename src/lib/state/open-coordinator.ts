import type {
  AppError,
  DocumentSelection,
  DocumentService,
  DocumentSnapshot,
  RenderGeneration,
  RenderResult,
  RenderService,
  ResourceService,
  SessionId,
} from '../contracts/document';
import { toRenderGeneration } from '../contracts/document';

export interface ActiveDocument {
  readonly generation: RenderGeneration;
  readonly snapshot: DocumentSnapshot;
  readonly render: RenderResult;
}

export type OpenOutcome =
  | {
      readonly status: 'activated';
      readonly active: ActiveDocument;
      readonly ignoredPaths: number;
    }
  | {
      readonly status: 'failed';
      readonly error: AppError;
      readonly active: ActiveDocument | null;
    }
  | { readonly status: 'superseded'; readonly active: ActiveDocument | null };

type ErrorNormalizer = (error: unknown) => AppError;

const defaultErrorNormalizer: ErrorNormalizer = (error) => ({
  code:
    error &&
    typeof error === 'object' &&
    'code' in error &&
    typeof error.code === 'string'
      ? (error.code as AppError['code'])
      : 'render_failed',
  message:
    error &&
    typeof error === 'object' &&
    'message' in error &&
    typeof error.message === 'string'
      ? error.message
      : error instanceof Error
        ? error.message
        : 'Ouverture impossible.',
});

export class OpenCoordinator {
  private latestIntent = 0;
  private generation = 0;
  private current: ActiveDocument | null = null;

  constructor(
    private readonly documents: DocumentService,
    private readonly renderer: RenderService,
    private readonly resources: ResourceService,
    private readonly normalizeError: ErrorNormalizer = defaultErrorNormalizer,
  ) {}

  get active(): ActiveDocument | null {
    return this.current;
  }

  cancelPending(): void {
    ++this.latestIntent;
  }

  async open(selection: DocumentSelection): Promise<OpenOutcome> {
    const intent = ++this.latestIntent;

    if (selection.paths.length === 0) {
      return {
        status: 'failed',
        error: {
          code: 'document_not_found',
          message: 'Aucun document à ouvrir.',
        },
        active: this.current,
      };
    }

    let candidateSession: SessionId | null = null;

    try {
      const snapshot = await this.documents.openFirst({
        paths: [selection.paths[0]!],
      });
      candidateSession = snapshot.sessionId;
      const render = await this.renderer.render(snapshot);

      if (intent !== this.latestIntent) {
        await this.releaseCandidate(snapshot.sessionId);
        return { status: 'superseded', active: this.current };
      }

      const previous = this.current;
      this.current = {
        generation: toRenderGeneration(++this.generation),
        snapshot,
        render,
      };

      if (previous) {
        await this.releaseCandidate(previous.snapshot.sessionId);
      }

      return {
        status: 'activated',
        active: this.current,
        ignoredPaths: selection.paths.length - 1,
      };
    } catch (error) {
      if (candidateSession) {
        await this.releaseCandidate(candidateSession);
      }

      if (intent !== this.latestIntent) {
        return { status: 'superseded', active: this.current };
      }

      return {
        status: 'failed',
        error: this.normalizeError(error),
        active: this.current,
      };
    }
  }

  async close(): Promise<void> {
    ++this.latestIntent;
    const current = this.current;
    this.current = null;

    if (current) {
      await this.releaseCandidate(current.snapshot.sessionId);
    }
  }

  private async releaseCandidate(sessionId: SessionId): Promise<void> {
    await Promise.allSettled([
      this.resources.releaseSession(sessionId),
      this.documents.releaseSession(sessionId),
    ]);
  }
}
