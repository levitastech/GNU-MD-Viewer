import { invoke } from '@tauri-apps/api/core';

import type { AppError } from '../contracts/document';
import { normalizeNativeError } from './native-errors';

export interface ExternalLinkService {
  open(target: string): Promise<void>;
}

export const isExternalHttpUrl = (target: string): boolean => {
  try {
    const url = new URL(target);
    return (
      (url.protocol === 'http:' || url.protocol === 'https:') &&
      url.username === '' &&
      url.password === ''
    );
  } catch {
    return false;
  }
};

export class TauriExternalLinkService implements ExternalLinkService {
  async open(target: string): Promise<void> {
    if (!isExternalHttpUrl(target)) {
      throw {
        code: 'access_denied',
        message: 'Seuls les liens HTTP(S) sans identifiants sont autorisés.',
      } satisfies AppError;
    }
    try {
      await invoke('open_external_url', { target });
    } catch (error) {
      throw normalizeNativeError(error, {
        code: 'access_denied',
        message: "Le navigateur système n'a pas pu ouvrir ce lien.",
      });
    }
  }
}
