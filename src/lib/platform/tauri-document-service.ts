import { invoke } from '@tauri-apps/api/core';

import type {
  DocumentSelection,
  DocumentService,
  DocumentSnapshot,
  SessionId,
} from '../contracts/document';
import { toDocumentId, toSessionId } from '../contracts/document';
import { normalizeNativeError } from './native-errors';

interface NativeDocumentSnapshot {
  readonly documentId: string;
  readonly sessionId: string;
  readonly text: string;
  readonly displayName: string;
  readonly encoding: 'utf-8';
  readonly revision: number;
}

export class TauriDocumentService implements DocumentService {
  async selectReload(sessionId: SessionId): Promise<DocumentSelection> {
    return invoke('select_document_reload', { sessionId });
  }

  async poll(sessionId: SessionId): Promise<boolean> {
    return invoke('poll_document', { sessionId });
  }

  async selectRoot(sessionId: SessionId): Promise<DocumentSelection | null> {
    return invoke<DocumentSelection | null>('select_root_extension', {
      sessionId,
    });
  }

  async selectDocument(): Promise<DocumentSelection | null> {
    try {
      return await invoke<DocumentSelection | null>('select_document');
    } catch (error) {
      throw normalizeNativeError(error, {
        code: 'access_denied',
        message: "Le dialogue d'ouverture n'est pas disponible.",
      });
    }
  }

  async openFirst(selection: DocumentSelection): Promise<DocumentSnapshot> {
    try {
      const snapshot = await invoke<NativeDocumentSnapshot>('open_document', {
        selection,
      });
      return {
        ...snapshot,
        documentId: toDocumentId(snapshot.documentId),
        sessionId: toSessionId(snapshot.sessionId),
      };
    } catch (error) {
      throw normalizeNativeError(error, {
        code: 'access_denied',
        message: "Le document n'a pas pu être ouvert.",
      });
    }
  }

  async selectRelative(
    sessionId: SessionId,
    target: string,
  ): Promise<DocumentSelection> {
    return invoke<DocumentSelection>('select_relative_document', {
      sessionId,
      target,
    });
  }

  async releaseSession(sessionId: SessionId): Promise<void> {
    await invoke('release_document_session', { sessionId });
  }
}
