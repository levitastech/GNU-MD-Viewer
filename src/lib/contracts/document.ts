export type OpaqueId<Name extends string> = string & {
  readonly __opaqueId: Name;
};

export type DocumentId = OpaqueId<'DocumentId'>;
export type SessionId = OpaqueId<'SessionId'>;
export type ResourceToken = OpaqueId<'ResourceToken'>;

export type RenderGeneration = number & {
  readonly __renderGeneration: true;
};

export type UnsanitizedHtml = string & {
  readonly __unsanitizedHtml: true;
};

export type SafeHtml = string & {
  readonly __safeHtml: true;
};

export const APP_ERROR_CODES = [
  'access_denied',
  'document_not_found',
  'document_too_large',
  'invalid_utf8',
  'render_failed',
  'resource_invalid',
  'resource_not_found',
  'resource_outside_root',
  'resource_revoked',
  'resource_too_large',
  'unsupported_format',
  'unsupported_platform',
] as const;

export type AppErrorCode = (typeof APP_ERROR_CODES)[number];

export interface AppError {
  readonly code: AppErrorCode;
  readonly message: string;
}

export interface SourcePosition {
  readonly line: number;
  readonly column: number;
  readonly offset: number;
}

export interface HeadingEntry {
  readonly id: string;
  readonly level: 1 | 2 | 3 | 4 | 5 | 6;
  readonly text: string;
  readonly position: SourcePosition;
}

export interface DocumentSnapshot {
  readonly documentId: DocumentId;
  readonly sessionId: SessionId;
  readonly text: string;
  readonly displayName: string;
  readonly encoding: 'utf-8';
  readonly revision: number;
}

export interface DeclaredResource {
  readonly occurrence: number;
  readonly target: string;
  readonly kind: 'image';
  readonly altText: string;
}

export interface EnrichmentBlock {
  readonly occurrence: number;
  readonly kind: 'code' | 'katex-inline' | 'katex-block' | 'mermaid';
  readonly language?: string;
  readonly source: string;
}

export interface RenderDiagnostic {
  readonly code: string;
  readonly message: string;
  readonly position?: SourcePosition;
}

export interface RenderResult {
  readonly html: UnsanitizedHtml;
  readonly headings: readonly HeadingEntry[];
  readonly resources: readonly DeclaredResource[];
  readonly enrichments: readonly EnrichmentBlock[];
  readonly diagnostics: readonly RenderDiagnostic[];
}

export interface ResourceRequest {
  readonly sessionId: SessionId;
  readonly documentId: DocumentId;
  readonly target: string;
  readonly expectedKind: 'image';
}

export interface ResolvedResource {
  readonly token: ResourceToken;
  readonly url: string;
  readonly mime: 'image/png' | 'image/jpeg' | 'image/gif' | 'image/webp';
  readonly encodedBytes: number;
  readonly width: number;
  readonly height: number;
}

export interface DocumentSelection {
  readonly paths: readonly string[];
}

export interface DocumentService {
  selectDocument(): Promise<DocumentSelection | null>;
  selectRoot(sessionId: SessionId): Promise<DocumentSelection | null>;
  selectRelative(
    sessionId: SessionId,
    target: string,
  ): Promise<DocumentSelection>;
  openFirst(selection: DocumentSelection): Promise<DocumentSnapshot>;
  releaseSession(sessionId: SessionId): Promise<void>;
}

export type WatchEvent =
  | { readonly kind: 'changed'; readonly revision: number }
  | { readonly kind: 'removed' }
  | { readonly kind: 'error'; readonly error: AppError };

export interface WatchService {
  subscribe(
    documentId: DocumentId,
    listener: (event: WatchEvent) => void,
  ): Promise<() => Promise<void>>;
}

export interface ResourceService {
  resolve(request: ResourceRequest): Promise<ResolvedResource>;
  releaseSession(sessionId: SessionId): Promise<void>;
}

export interface PreferenceEnvelope<Value> {
  readonly version: number;
  readonly value: Value;
}

export interface PreferenceService<Value> {
  load(): Promise<PreferenceEnvelope<Value>>;
  save(preferences: PreferenceEnvelope<Value>): Promise<void>;
}

export interface RenderService {
  render(snapshot: DocumentSnapshot): Promise<RenderResult>;
}

export const toDocumentId = (value: string): DocumentId => value as DocumentId;
export const toSessionId = (value: string): SessionId => value as SessionId;
export const toResourceToken = (value: string): ResourceToken =>
  value as ResourceToken;

export const toRenderGeneration = (value: number): RenderGeneration => {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new RangeError(
      'Une génération de rendu doit être un entier positif.',
    );
  }

  return value as RenderGeneration;
};
